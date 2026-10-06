import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface SkateparksSpots {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    stadt?: string;
    beschreibung?: string;
    untergrundtyp?: LookupValue;
    standort?: GeoLocation; // { lat, long, info }
    website?: string;
  };
}

export interface EventVerwaltung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    kategorie?: LookupValue;
    datum_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    beschreibung?: string;
    skill_level?: LookupValue;
    max_teilnehmer?: number;
    startgebuehr?: number;
    ort?: RecordUrl; // applookup -> URL zu 'SkateparksSpots' Record
    kontakt_email?: string;
    event_website?: string;
    flyer?: string;
    kontakt_telefon?: string;
  };
}

export interface Anmeldungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    event?: RecordUrl; // applookup -> URL zu 'EventVerwaltung' Record
    vorname?: string;
    nachname?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    email?: string;
    telefon?: string;
    skill_level?: LookupValue;
    board_stil?: LookupValue[];
    anmerkungen?: string;
    teilnahmebedingungen?: boolean;
  };
}

export const APP_IDS = {
  SKATEPARKS_SPOTS: '6a56741a9ef9a79ac692ad70',
  EVENT_VERWALTUNG: '6a56741f84d8dce105858830',
  ANMELDUNGEN: '6a5674227925510842ea49d7',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'skateparks_spots': {
    untergrundtyp: [{ key: "beton", get label() { return lookupLabel('skateparks_spots', 'untergrundtyp', "beton") ?? "Beton"; } }, { key: "asphalt", get label() { return lookupLabel('skateparks_spots', 'untergrundtyp', "asphalt") ?? "Asphalt"; } }, { key: "holz", get label() { return lookupLabel('skateparks_spots', 'untergrundtyp', "holz") ?? "Holz"; } }, { key: "fliesen", get label() { return lookupLabel('skateparks_spots', 'untergrundtyp', "fliesen") ?? "Fliesen"; } }, { key: "sonstiges", get label() { return lookupLabel('skateparks_spots', 'untergrundtyp', "sonstiges") ?? "Sonstiges"; } }],
  },
  'event_verwaltung': {
    kategorie: [{ key: "jam", get label() { return lookupLabel('event_verwaltung', 'kategorie', "jam") ?? "Jam Session"; } }, { key: "demo", get label() { return lookupLabel('event_verwaltung', 'kategorie', "demo") ?? "Demo"; } }, { key: "workshop", get label() { return lookupLabel('event_verwaltung', 'kategorie', "workshop") ?? "Workshop"; } }, { key: "sonstiges", get label() { return lookupLabel('event_verwaltung', 'kategorie', "sonstiges") ?? "Sonstiges"; } }, { key: "contest", get label() { return lookupLabel('event_verwaltung', 'kategorie', "contest") ?? "Contest"; } }],
    skill_level: [{ key: "anfaenger", get label() { return lookupLabel('event_verwaltung', 'skill_level', "anfaenger") ?? "Anfänger"; } }, { key: "fortgeschritten", get label() { return lookupLabel('event_verwaltung', 'skill_level', "fortgeschritten") ?? "Fortgeschritten"; } }, { key: "profi", get label() { return lookupLabel('event_verwaltung', 'skill_level', "profi") ?? "Profi"; } }, { key: "alle_levels", get label() { return lookupLabel('event_verwaltung', 'skill_level', "alle_levels") ?? "Alle Levels"; } }],
  },
  'anmeldungen': {
    skill_level: [{ key: "anfaenger", get label() { return lookupLabel('anmeldungen', 'skill_level', "anfaenger") ?? "Anfänger"; } }, { key: "fortgeschritten", get label() { return lookupLabel('anmeldungen', 'skill_level', "fortgeschritten") ?? "Fortgeschritten"; } }, { key: "profi", get label() { return lookupLabel('anmeldungen', 'skill_level', "profi") ?? "Profi"; } }],
    board_stil: [{ key: "street", get label() { return lookupLabel('anmeldungen', 'board_stil', "street") ?? "Street"; } }, { key: "park", get label() { return lookupLabel('anmeldungen', 'board_stil', "park") ?? "Park"; } }, { key: "vert", get label() { return lookupLabel('anmeldungen', 'board_stil', "vert") ?? "Vert"; } }, { key: "bowl", get label() { return lookupLabel('anmeldungen', 'board_stil', "bowl") ?? "Bowl"; } }, { key: "freestyle", get label() { return lookupLabel('anmeldungen', 'board_stil', "freestyle") ?? "Freestyle"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'skateparks_spots': {
    'name': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'stadt': 'string/text',
    'beschreibung': 'string/textarea',
    'untergrundtyp': 'lookup/select',
    'standort': 'geo',
    'website': 'string/url',
  },
  'event_verwaltung': {
    'titel': 'string/text',
    'kategorie': 'lookup/select',
    'datum_uhrzeit': 'date/datetimeminute',
    'beschreibung': 'string/textarea',
    'skill_level': 'lookup/select',
    'max_teilnehmer': 'number',
    'startgebuehr': 'number',
    'ort': 'applookup/select',
    'kontakt_email': 'string/email',
    'event_website': 'string/url',
    'flyer': 'file',
    'kontakt_telefon': 'string/tel',
  },
  'anmeldungen': {
    'event': 'applookup/select',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'geburtsdatum': 'date/date',
    'email': 'string/email',
    'telefon': 'string/tel',
    'skill_level': 'lookup/select',
    'board_stil': 'multiplelookup/checkbox',
    'anmerkungen': 'string/textarea',
    'teilnahmebedingungen': 'bool',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

// Aliases for the pre-0.0.279 app keys (see 4c).
LOOKUP_OPTIONS['skateparks_&_spots'] = LOOKUP_OPTIONS['skateparks_spots'];
FIELD_TYPES['skateparks_&_spots'] = FIELD_TYPES['skateparks_spots'];

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSkateparksSpots = StripLookup<SkateparksSpots['fields']>;
export type CreateEventVerwaltung = StripLookup<EventVerwaltung['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;