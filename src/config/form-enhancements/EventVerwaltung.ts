// Auto-generated. Per-entity form-enhancements config for "Event-Verwaltung".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", {"row": ["kategorie", "skill_level"], "cols": "1fr 1fr"}, "datum_uhrzeit", "ort", {"row": ["max_teilnehmer", "startgebuehr"], "cols": "1fr 1fr"}, {"row": ["kontakt_email", "kontakt_telefon"], "cols": "1fr 1fr"}, "event_website", "beschreibung", "notizen"],
  defaults: {
    'datum_uhrzeit': { kind: 'today', withTime: true },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
