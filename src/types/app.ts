// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
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
    ort?: string; // applookup -> URL zu 'SkateparksSpots' Record
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
    event?: string; // applookup -> URL zu 'EventVerwaltung' Record
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
    untergrundtyp: [{ key: "beton", label: "Beton" }, { key: "asphalt", label: "Asphalt" }, { key: "holz", label: "Holz" }, { key: "fliesen", label: "Fliesen" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'event_verwaltung': {
    kategorie: [{ key: "contest", label: "Contest" }, { key: "jam", label: "Jam Session" }, { key: "demo", label: "Demo" }, { key: "workshop", label: "Workshop" }, { key: "sonstiges", label: "Sonstiges" }],
    skill_level: [{ key: "fortgeschritten", label: "Fortgeschritten" }, { key: "profi", label: "Profi" }, { key: "alle_levels", label: "Alle Levels" }, { key: "anfaenger", label: "Anfänger" }],
  },
  'anmeldungen': {
    skill_level: [{ key: "fortgeschritten", label: "Fortgeschritten" }, { key: "profi", label: "Profi" }, { key: "anfaenger", label: "Anfänger" }],
    board_stil: [{ key: "street", label: "Street" }, { key: "park", label: "Park" }, { key: "vert", label: "Vert" }, { key: "bowl", label: "Bowl" }, { key: "freestyle", label: "Freestyle" }],
  },
};

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