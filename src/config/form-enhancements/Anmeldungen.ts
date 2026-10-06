// Auto-generated. Per-entity form-enhancements config for "Anmeldungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["event", {"row": ["vorname", "nachname"]}, "email", "skill_level", {"row": ["geburtsdatum", "telefon"], "cols": "1fr 1fr"}, "board_stil", "teilnahmebedingungen", "anmerkungen"],
  defaults: {
    'skill_level': { kind: 'lookup', key: 'anfaenger', label: 'Anfänger' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
