import type { Anmeldungen, EventVerwaltung } from './app';

export type EnrichedAnmeldungen = Anmeldungen & {
  eventName: string;
};

export type EnrichedEventVerwaltung = EventVerwaltung & {
  ortName: string;
};
