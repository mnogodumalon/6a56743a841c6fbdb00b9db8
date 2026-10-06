/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'skateparks_spots' | 'anmeldungen' | 'event_verwaltung';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "skateparks_spots": "name" | "strasse" | "hausnummer" | "postleitzahl" | "stadt" | "beschreibung" | "website";
  "anmeldungen": "vorname" | "nachname" | "email" | "telefon" | "anmerkungen";
  "event_verwaltung": "titel" | "beschreibung" | "kontakt_email" | "event_website" | "kontakt_telefon" | "notizen";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "skateparks_spots": never;
  "anmeldungen": "event";
  "event_verwaltung": "ort";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it (`file` is upload-only, never via a journey). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "skateparks_spots": {
    "key": "skateparks_spots",
    "appId": "6a56741a9ef9a79ac692ad70",
    "label": "Skateparks & Spots",
    "pascal": "SkateparksSpots",
    "single": "SkateparksSpot"
  },
  "anmeldungen": {
    "key": "anmeldungen",
    "appId": "6a5674227925510842ea49d7",
    "label": "Anmeldungen",
    "pascal": "Anmeldungen",
    "single": "AnmeldungenEntry"
  },
  "event_verwaltung": {
    "key": "event_verwaltung",
    "appId": "6a56741f84d8dce105858830",
    "label": "Event-Verwaltung",
    "pascal": "EventVerwaltung",
    "single": "EventVerwaltungEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "skateparks_spots": {
    "name": {
      "key": "name",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name des Ortes",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "name"
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "postleitzahl": {
      "key": "postleitzahl",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "stadt": {
      "key": "stadt",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Stadt",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "untergrundtyp": {
      "key": "untergrundtyp",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Untergrundtyp",
      "writable": true,
      "options": [
        "beton",
        "asphalt",
        "holz",
        "fliesen",
        "sonstiges"
      ]
    },
    "standort": {
      "key": "standort",
      "fulltype": "geo",
      "kind": "geo",
      "required": false,
      "label": "Standort auf der Karte",
      "writable": true
    },
    "website": {
      "key": "website",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Website",
      "writable": true,
      "autoComplete": "url"
    }
  },
  "anmeldungen": {
    "event": {
      "key": "event",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Event",
      "writable": true,
      "targetAppId": "6a56741f84d8dce105858830",
      "targetEntity": "event_verwaltung"
    },
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "geburtsdatum": {
      "key": "geburtsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Geburtsdatum",
      "writable": true,
      "autoComplete": "bday"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail-Adresse",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefonnummer",
      "writable": true,
      "autoComplete": "tel"
    },
    "skill_level": {
      "key": "skill_level",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Skill-Level",
      "writable": true,
      "options": [
        "anfaenger",
        "fortgeschritten",
        "profi"
      ]
    },
    "board_stil": {
      "key": "board_stil",
      "fulltype": "multiplelookup/checkbox",
      "kind": "multilookup",
      "required": false,
      "label": "Board-Stil",
      "writable": true,
      "options": [
        "street",
        "park",
        "vert",
        "bowl",
        "freestyle"
      ]
    },
    "anmerkungen": {
      "key": "anmerkungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Anmerkungen",
      "writable": true
    },
    "teilnahmebedingungen": {
      "key": "teilnahmebedingungen",
      "fulltype": "bool",
      "kind": "bool",
      "required": true,
      "label": "Ich stimme den Teilnahmebedingungen zu",
      "writable": true
    }
  },
  "event_verwaltung": {
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel des Events",
      "writable": true,
      "maxLength": 4000
    },
    "kategorie": {
      "key": "kategorie",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Kategorie",
      "writable": true,
      "options": [
        "contest",
        "jam",
        "demo",
        "workshop",
        "sonstiges"
      ]
    },
    "datum_uhrzeit": {
      "key": "datum_uhrzeit",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Datum und Uhrzeit",
      "writable": true
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "skill_level": {
      "key": "skill_level",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Skill-Level",
      "writable": true,
      "options": [
        "anfaenger",
        "fortgeschritten",
        "profi",
        "alle_levels"
      ]
    },
    "max_teilnehmer": {
      "key": "max_teilnehmer",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Maximale Teilnehmerzahl",
      "writable": true
    },
    "startgebuehr": {
      "key": "startgebuehr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Startgebühr (€)",
      "writable": true,
      "format": "currency"
    },
    "ort": {
      "key": "ort",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Ort",
      "writable": true,
      "targetAppId": "6a56741a9ef9a79ac692ad70",
      "targetEntity": "skateparks_spots"
    },
    "kontakt_email": {
      "key": "kontakt_email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "Kontakt-E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "event_website": {
      "key": "event_website",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Website des Events",
      "writable": true,
      "autoComplete": "url"
    },
    "flyer": {
      "key": "flyer",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Flyer / Bild",
      "writable": false
    },
    "kontakt_telefon": {
      "key": "kontakt_telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Kontakt-Telefonnummer",
      "writable": true,
      "autoComplete": "tel"
    },
    "notizen": {
      "key": "notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notizen",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "skateparks_spots": [
    {
      "kind": "choice",
      "field": "untergrundtyp",
      "count": 5
    }
  ],
  "anmeldungen": [
    {
      "kind": "choice",
      "field": "skill_level",
      "count": 3
    },
    {
      "kind": "record",
      "field": "event",
      "targetEntity": "event_verwaltung"
    }
  ],
  "event_verwaltung": [
    {
      "kind": "choice",
      "field": "kategorie",
      "count": 5
    },
    {
      "kind": "choice",
      "field": "skill_level",
      "count": 4
    },
    {
      "kind": "record",
      "field": "ort",
      "targetEntity": "skateparks_spots"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "skateparks_spots": [
    "name"
  ],
  "anmeldungen": [
    "vorname",
    "nachname"
  ],
  "event_verwaltung": [
    "titel"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
