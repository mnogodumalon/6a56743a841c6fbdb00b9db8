import type { EnrichedAnmeldungen, EnrichedEventVerwaltung } from '@/types/enriched';
import type { Anmeldungen, EventVerwaltung, SkateparksSpots } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AnmeldungenMaps {
  eventVerwaltungMap: Map<string, EventVerwaltung>;
}

export function enrichAnmeldungen(
  anmeldungen: Anmeldungen[],
  maps: AnmeldungenMaps
): EnrichedAnmeldungen[] {
  return anmeldungen.map(r => ({
    ...r,
    eventName: resolveDisplay(r.fields.event, maps.eventVerwaltungMap, 'titel'),
  }));
}

interface EventVerwaltungMaps {
  skateparksSpotsMap: Map<string, SkateparksSpots>;
}

export function enrichEventVerwaltung(
  eventVerwaltung: EventVerwaltung[],
  maps: EventVerwaltungMaps
): EnrichedEventVerwaltung[] {
  return eventVerwaltung.map(r => ({
    ...r,
    ortName: resolveDisplay(r.fields.ort, maps.skateparksSpotsMap, 'name'),
  }));
}
