// Auto-generated. Per-entity form-enhancements config for "Artikel".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["bezeichnung", "artikelnummer"], "cols": "2fr 1fr"}, "kategorie", {"row": ["hersteller", "modell"], "cols": "1fr 1fr"}, "seriennummer", "zustand", "lagerort", {"row": ["bestand", "mindestbestand"], "cols": "1fr 1fr"}, "einheit", {"row": ["anschaffungsdatum", "anschaffungspreis"], "cols": "1fr 1fr"}, {"row": ["naechster_pruefermin_placeholder_removed", "naechster_pruefdatum"], "cols": "1fr 1fr"}, "bemerkungen"],
  defaults: {
    'zustand': { kind: 'lookup', key: 'neu', label: 'Neu' },
    'anschaffungsdatum': { kind: 'today' },
    'bestand': { kind: 'literal', value: 1 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
