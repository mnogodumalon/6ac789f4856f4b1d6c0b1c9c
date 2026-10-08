import { useMemo, useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  IconAlertTriangle, IconPlus, IconArrowsExchange, IconCalendarEvent, IconHistory, IconPackage,
  IconTool,
} from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedArtikel } from '@/types/enriched';
import { lookupKey, formatDate } from '@/lib/formatters';
import { useClock, gruss, namen } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCard, StatCardRow } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

type Filter = 'alle' | 'unter' | 'defekt' | 'ueberfaellig';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const crud = useEntityCrud(data, {
    footer: (top) => top.type === 'artikel'
      ? {
          label: tx('Zugang erfassen'),
          onClick: () => crud.bestandsbewegungen.openCreate({ artikel: top.record.record_id, bewegungsart: 'zugang' }),
        }
      : undefined,
  });
  const enrichedArtikel = crud.enriched.artikel;
  const enrichedBewegungen = crud.enriched.bestandsbewegungen;
  const clock = useClock();
  const todayKey = format(clock, 'yyyy-MM-dd');
  const [filter, setFilter] = useState<Filter>('alle');
  const [showAll, setShowAll] = useState(false);

  const name = (a: EnrichedArtikel) => a.fields.bezeichnung ?? a.fields.artikelnummer ?? tx('Ohne Bezeichnung');
  const isUnter = (a: EnrichedArtikel) =>
    a.fields.mindestbestand != null && (a.fields.bestand ?? 0) < a.fields.mindestbestand;
  const isDefekt = (a: EnrichedArtikel) => {
    const z = lookupKey(a.fields.zustand);
    return z === 'defekt' || z === 'reparaturbeduerftig';
  };
  const pruefDate = (a: EnrichedArtikel) => a.fields.naechster_pruefdatum?.slice(0, 10);
  const isUeberfaellig = (a: EnrichedArtikel) => {
    const d = pruefDate(a);
    return !!d && d < todayKey;
  };

  const unter = useMemo(() => enrichedArtikel.filter(isUnter), [enrichedArtikel]);
  const defekt = useMemo(() => enrichedArtikel.filter(isDefekt), [enrichedArtikel]);
  const ueberfaellig = useMemo(
    () => enrichedArtikel.filter(isUeberfaellig).sort((a, b) => (pruefDate(a) ?? '').localeCompare(pruefDate(b) ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedArtikel, todayKey],
  );
  const bevorstehend = useMemo(
    () => enrichedArtikel
      .filter(a => { const d = pruefDate(a); return !!d && d >= todayKey; })
      .sort((a, b) => (pruefDate(a) ?? '').localeCompare(pruefDate(b) ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedArtikel, todayKey],
  );
  const letzte = useMemo(
    () => [...enrichedBewegungen].sort((a, b) => (b.fields.zeitpunkt ?? b.createdat).localeCompare(a.fields.zeitpunkt ?? a.createdat)),
    [enrichedBewegungen],
  );

  const visible = useMemo(() => {
    const base = enrichedArtikel.filter(a =>
      filter === 'unter' ? isUnter(a)
        : filter === 'defekt' ? isDefekt(a)
        : filter === 'ueberfaellig' ? isUeberfaellig(a)
        : true);
    const rank = (a: EnrichedArtikel) => (isUnter(a) ? 0 : isDefekt(a) ? 1 : 2);
    return [...base].sort((a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedArtikel, filter, todayKey]);
  const shown = showAll ? visible : visible.slice(0, 12);

  const chartRows = useMemo<ChartRow<EnrichedArtikel>[]>(
    () => enrichedArtikel.map(a => ({ id: `artikel:${a.record_id}`, data: a })),
    [enrichedArtikel],
  );

  const openArtikel = (id: string) => {
    const rec = data.artikel.find(a => a.record_id === id);
    if (rec) crud.artikel.openDetail(rec);
  };
  const openBewegung = (id: string) => {
    const rec = data.bestandsbewegungen.find(b => b.record_id === id);
    if (rec) crud.bestandsbewegungen.openDetail(rec);
  };

  const dueText = (a: EnrichedArtikel) => {
    const d = pruefDate(a);
    if (!d) return '';
    const n = differenceInCalendarDays(parseISO(d), parseISO(todayKey));
    return n === 0 ? tx('heute') : n === 1 ? tx('morgen') : tx`in ${n} Tagen`;
  };

  // Context line — names in every branch
  let context: string;
  if (enrichedArtikel.length === 0) {
    context = tx('Lege deinen ersten Artikel an, dann behältst du den Bestand im Blick.');
  } else if (unter.length > 0) {
    const n = namen(unter.map(name));
    context = defekt.length > 0
      ? tx`Nachbestellen: ${n} — außerdem ${namen(defekt.map(name))} nicht einsatzbereit.`
      : tx`Nachbestellen: ${n} liegt unter dem Mindestbestand.`;
  } else if (defekt.length > 0) {
    context = tx`${namen(defekt.map(name))} ist nicht einsatzbereit.`;
  } else if (bevorstehend.length > 0) {
    context = tx`Alle Bestände ok — nächste Prüfung: ${name(bevorstehend[0])} ${dueText(bevorstehend[0])}.`;
  } else {
    context = tx`Alle Bestände ok — ${namen(enrichedArtikel.map(name))} im Lager.`;
  }

  const filterLabel: Record<Filter, string> = {
    alle: tx('Alle Artikel'),
    unter: tx('Unter Mindestbestand'),
    defekt: tx('Defekt / Reparatur'),
    ueberfaellig: tx('Prüfung überfällig'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crud.bestandsbewegungen.canWrite && (
            <Button variant="outline" onClick={() => crud.bestandsbewegungen.openCreate({})}>
              <IconArrowsExchange size={16} className="shrink-0" />
              {tx('Bewegung erfassen')}
            </Button>
          )}
          {crud.artikel.canWrite && (
            <Button onClick={() => crud.artikel.openCreate({})}>
              <IconPlus size={16} className="shrink-0" />
              {tx('Neuer Artikel')}
            </Button>
          )}
        </div>
      </div>

      <DashboardGrid
        variant="split"
        hero={ueberfaellig.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{ label: tx('Überfällige anzeigen'), onClick: () => { setFilter('ueberfaellig'); setShowAll(false); } }}
          >
            <b>{namen(ueberfaellig.map(name))}</b>{' '}
            {tx`— Prüfung überfällig seit ${formatDate(pruefDate(ueberfaellig[0]))}.`}
          </HeroBanner>
        )}
        kpis={enrichedArtikel.length > 0 ? (
          <StatCardRow>
            <StatCard
              title={tx('Unter Mindestbestand')}
              value={unter.length}
              description={unter.length > 0 ? tx('Nachbestellen oder Zugang erfassen') : tx('Alle Bestände ausreichend')}
              icon={<IconPackage size={18} className="text-muted-foreground" />}
              tone={unter.length > 0 ? 'warning' : 'default'}
              onClick={() => { setFilter(f => (f === 'unter' ? 'alle' : 'unter')); setShowAll(false); }}
              active={filter === 'unter'}
            />
            <StatCard
              title={tx('Defekt / Reparatur')}
              value={defekt.length}
              description={defekt.length > 0 ? tx('Nicht einsatzbereit') : tx('Alles einsatzbereit')}
              icon={<IconTool size={18} className="text-muted-foreground" />}
              tone={defekt.length > 0 ? 'destructive' : 'default'}
              onClick={() => { setFilter(f => (f === 'defekt' ? 'alle' : 'defekt')); setShowAll(false); }}
              active={filter === 'defekt'}
            />
          </StatCardRow>
        ) : undefined}
        aside={
          <>
            <WorkList
              title={tx('Anstehende Prüftermine')}
              icon={<IconCalendarEvent size={16} />}
              items={bevorstehend.map(a => ({
                id: a.record_id,
                title: name(a),
                secondLine: (
                  <>
                    <span className="font-medium">{dueText(a)}</span>
                    <span className="text-muted-foreground"> · {formatDate(pruefDate(a))}</span>
                  </>
                ),
              }))}
              onItemClick={openArtikel}
              empty={{ text: tx('Keine Prüftermine geplant.') }}
            />
            <WorkList
              title={tx('Letzte Bestandsbewegungen')}
              icon={<IconHistory size={16} />}
              items={letzte.map(b => ({
                id: b.record_id,
                title: b.artikelName || tx('Unbekannter Artikel'),
                secondLine: (
                  <>
                    <span className="font-medium">{b.fields.bewegungsart?.label ?? '—'}</span>
                    <span className="text-muted-foreground">
                      {' · '}{b.fields.menge ?? '—'}{b.fields.person_nachname ? ` · ${b.fields.person_nachname}` : ''}
                    </span>
                  </>
                ),
              }))}
              onItemClick={openBewegung}
              empty={{
                text: tx('Noch keine Bewegungen erfasst.'),
                action: crud.bestandsbewegungen.canWrite
                  ? { label: tx('Bewegung erfassen'), onClick: () => crud.bestandsbewegungen.openCreate({}) }
                  : undefined,
              }}
              max={4}
            />
            <ChartWidget<EnrichedArtikel>
              title={tx('Artikel nach Kategorie')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.kategorie, label: tx('Kategorie') }}
            />
          </>
        }
        primary={
          <section className="overflow-hidden rounded-[27px] bg-card p-5 shadow-lg">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {appLabel('artikel')} — {tx('Bestand und Mindestbestand')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {filter === 'alle' ? tx`${visible.length} Artikel` : tx`${filterLabel[filter]}: ${visible.length}`}
                </p>
              </div>
              {filter !== 'alle' && (
                <Button variant="ghost" size="sm" onClick={() => setFilter('alle')}>{tx('Filter zurücksetzen')}</Button>
              )}
            </div>
            {shown.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <IconPackage size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {enrichedArtikel.length === 0 ? tx('Noch keine Artikel im Lager.') : tx('Keine Artikel in dieser Auswahl.')}
                </p>
                {enrichedArtikel.length === 0 && crud.artikel.canWrite && (
                  <Button onClick={() => crud.artikel.openCreate({})}>{tx('Ersten Artikel anlegen')}</Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {shown.map(a => {
                  const best = a.fields.bestand ?? 0;
                  const min = a.fields.mindestbestand;
                  const low = isUnter(a);
                  const def = isDefekt(a);
                  const over = isUeberfaellig(a);
                  const scale = Math.max(best, (min ?? 0) * 2, 1);
                  const unit = a.fields.einheit?.label ?? '';
                  return (
                    <li key={a.record_id} className={def ? 'bg-destructive/5' : undefined}>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-3">
                        <button
                          type="button"
                          onClick={() => openArtikel(a.record_id)}
                          className="min-w-0 flex-1 basis-48 text-left"
                        >
                          <span className="block truncate text-sm font-medium">{name(a)}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[a.fields.kategorie?.label, a.lagerortName].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </button>
                        <div className="min-w-0 basis-40 flex-1">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className={low ? 'font-semibold text-destructive' : 'font-medium'}>
                              {best} {unit}
                            </span>
                            <span className="text-muted-foreground">
                              {min != null ? tx`Min. ${min}` : tx('Kein Minimum')}
                            </span>
                          </div>
                          <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${low ? 'bg-destructive' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (best / scale) * 100)}%` }}
                            />
                            {min != null && (
                              <div
                                className="absolute top-0 h-full w-0.5 bg-foreground/60"
                                style={{ left: `${Math.min(100, (min / scale) * 100)}%` }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {def && (
                            <span className="font-medium text-destructive">{a.fields.zustand?.label}</span>
                          )}
                          {over && (
                            <span className="font-medium text-destructive">{tx('Prüfung überfällig')}</span>
                          )}
                          {low && crud.bestandsbewegungen.canWrite && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => crud.bestandsbewegungen.openCreate({ artikel: a.record_id, bewegungsart: 'zugang' })}
                            >
                              {tx('Zugang')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {visible.length > 12 && (
              <div className="pt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>
                  {showAll ? tx('Weniger anzeigen') : tx`Alle ${visible.length} anzeigen`}
                </Button>
              </div>
            )}
          </section>
        }
      />
      {crud.surfaces}
    </div>
  );
}
