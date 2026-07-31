import type { Anmeldungen, EventVerwaltung } from './app';

export type EnrichedEventVerwaltung = EventVerwaltung & {
  ortName: string;
};

export type EnrichedAnmeldungen = Anmeldungen & {
  eventName: string;
};
