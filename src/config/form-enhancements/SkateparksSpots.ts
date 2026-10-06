// Auto-generated. Per-entity form-enhancements config for "Skateparks & Spots".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["name", {"row": ["strasse", "hausnummer"], "cols": "3fr 1fr"}, {"row": ["postleitzahl", "stadt"], "cols": "1fr 2fr"}, "untergrundtyp", "website", "beschreibung"],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
