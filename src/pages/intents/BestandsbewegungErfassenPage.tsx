/**
 * Bestandsbewegung erfassen — 4-Schritt-Wizard.
 * Steps: 1) Artikel wählen (mit aktuellem Bestand) → 2) Art der Bewegung → 3) Menge, Person, Zweck → 4) Prüfen & speichern.
 * Reads: artikel (Bestand, Einheit, Lagerort). Writes: bestandsbewegungen (via useBestandsbewegungErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, BudgetTracker, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useBestandsbewegungErfassenFlow } from '@/lib/journey/flows/BestandsbewegungErfassen';
import { tx } from '@/i18n';

// Bewegungen, die den Bestand verringern
const OUTGOING = ['entnahme', 'verbrauch', 'aussonderung'];

export default function BestandsbewegungErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useBestandsbewegungErfassenFlow({
    steps: { artikel: 1, bewegungsart: 2, menge: 3, person_vorname: 3, person_nachname: 3, verwendungszweck: 3, bemerkungen: 3 },
    items: {
      artikel: (r, ctx) => {
        const bestand = fieldNumber(r, 'bestand');
        const einheit = fieldLookup(r, 'einheit')?.label ?? '';
        return {
          id: r.id,
          title: fieldText(r, 'bezeichnung'),
          subtitle: [fieldText(r, 'artikelnummer'), ctx.ref('lagerort')].filter(Boolean).join(' · '),
          stats: [{ label: tx('Bestand'), value: `${bestand ?? 0} ${einheit}`.trim() }],
        };
      },
    },
  });

  const form = flow.forms.bestandsbewegungen;
  const artikelId = form.get('artikel') as string | null;
  const artikel = artikelId ? flow.picks.artikel.recordOf(artikelId) : undefined;
  const bestand = artikel ? fieldNumber(artikel, 'bestand') ?? 0 : 0;
  const einheit = artikel ? fieldLookup(artikel, 'einheit')?.label ?? '' : '';
  const art = (form.get('bewegungsart') as string | null) ?? '';
  const menge = Number(String(form.get('menge') ?? '').replace(',', '.')) || 0;
  const outgoing = OUTGOING.includes(art);
  const insufficient = outgoing && menge > bestand;

  const checkStep3 = () => {
    if (!flow.validateStep(3)) return false;
    if (insufficient) return tx('Der Bestand reicht für diese Menge nicht aus.');
    return true;
  };

  return (
    <IntentWizardShell
      title={tx('Bestandsbewegung erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Entnahme, Rückgabe, Zugang, Verbrauch oder Aussonderung festhalten.'),
        needs: [tx('Den Artikel'), tx('Menge und Name der Person')],
      }}
    >
      <WizardStep label={tx('Artikel')} description={tx('Welcher Artikel ist betroffen? Der aktuelle Bestand steht auf der Karte.')}>
        <EntitySelectStep
          {...flow.picks.artikel.select}
          {...flow.pick('artikel')}
          searchPlaceholder={tx('Bezeichnung oder Artikelnummer …')}
        />
      </WizardStep>

      <WizardStep label={tx('Bewegung')} description={tx('Was passiert mit dem Artikel?')} needs={['artikel']}>
        <div className="space-y-4">
          {artikel && (
            <BudgetTracker
              format="count"
              unit={einheit || tx('Stück')}
              budget={Math.max(bestand, 0)}
              booked={0}
              label={tx`Aktueller Bestand: ${fieldText(artikel, 'bezeichnung')}`}
            />
          )}
          <Bound form={form} name="bewegungsart" />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Menge & Person')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Details')} description={tx('Wie viel, wer und wofür?')} needs={['artikel', 'bewegungsart']}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tx`Aktueller Bestand: ${bestand} ${einheit}`}
          </p>
          <Bound form={form} name="menge" />
          {insufficient && (
            <p className="text-xs text-destructive">{tx('Der Bestand reicht für diese Menge nicht aus.')}</p>
          )}
          <Bound form={form} name="person_vorname" />
          <Bound form={form} name="person_nachname" />
          <Bound form={form} name="verwendungszweck" />
          <Bound form={form} name="bemerkungen" />
          <StepNav onBack={() => setStep(2)} onNext={checkStep3} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Bewegung wird im Bestandsprotokoll gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Weitere Bewegung erfassen'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Artikel anlegen'), href: '#/intents/artikel-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
