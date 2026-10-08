/**
 * Artikel anlegen — 4-Schritt-Wizard.
 * Steps: 1) Stammdaten → 2) Lagerort wählen → 3) Bestandsdaten & Anschaffung → 4) Prüfen & speichern.
 * Reads: lagerorte. Writes: artikel (über useArtikelAnlegenFlow).
 * Composes: IntentWizardShell, Bound, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useArtikelAnlegenFlow } from '@/lib/journey/flows/ArtikelAnlegen';
import { tx } from '@/i18n';

export default function ArtikelAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useArtikelAnlegenFlow({
    steps: {
      bezeichnung: 1, artikelnummer: 1, kategorie: 1, hersteller: 1, modell: 1, seriennummer: 1, zustand: 1,
      lagerort: 2,
      mindestbestand: 3, einheit: 3, anschaffungsdatum: 3, anschaffungspreis: 3,
      naechster_pruefermin_placeholder_removed: 3, naechster_pruefdatum: 3, bemerkungen: 3,
    },
    items: {
      lagerort: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: [fieldText(r, 'bereich'), fieldText(r, 'regal'), fieldText(r, 'fach')].filter(Boolean).join(' · '),
      }),
    },
  });
  const f = flow.forms.artikel;

  return (
    <IntentWizardShell
      title={tx('Artikel anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Einen neuen Artikel mit Lagerort und Mindestbestand anlegen.'), needs: [tx('Bezeichnung und Kategorie'), tx('Lagerort')] }}
    >
      <WizardStep label={tx('Stammdaten')} description={tx('Wie heißt der Artikel und was ist es?')}>
        <div className="space-y-4">
          <Bound form={f} name="bezeichnung" />
          <Bound form={f} name="artikelnummer" />
          <Bound form={f} name="kategorie" />
          <Bound form={f} name="hersteller" />
          <Bound form={f} name="modell" />
          <Bound form={f} name="seriennummer" />
          <Bound form={f} name="zustand" allowClear />
          <StepNav hideBack onNext={() => flow.validateStep(1)} nextStepLabel={tx('Lagerort')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Lagerort')} description={tx('Wo wird der Artikel gelagert? Du kannst den Schritt auch überspringen.')}>
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.lagerort.select}
            {...flow.pick('lagerort')}
            searchPlaceholder={tx('Lagerort suchen …')}
            avatar="none"
          />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Bestandsdaten')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Bestand')} description={tx('Mindestbestand, Einheit und Anschaffung festhalten.')}>
        <div className="space-y-4">
          <Bound form={f} name="mindestbestand" />
          <Bound form={f} name="einheit" allowClear />
          <Bound form={f} name="anschaffungsdatum" />
          <Bound form={f} name="anschaffungspreis" />
          <Bound form={f} name="naechster_pruefermin_placeholder_removed" />
          <Bound form={f} name="naechster_pruefdatum" />
          <Bound form={f} name="bemerkungen" rows={3} />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Artikel erscheint sofort in deinem Bestand. Den Anfangsbestand erfasst du danach als Bestandsbewegung.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Bestandsbewegung erfassen'), href: '#/intents/bestandsbewegung-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
