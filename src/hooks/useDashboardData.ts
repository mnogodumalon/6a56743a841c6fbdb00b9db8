import { useState, useEffect, useMemo, useCallback } from 'react';
import type { SkateparksSpots, EventVerwaltung, Anmeldungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [skateparksSpots, setSkateparksSpots] = useState<SkateparksSpots[]>([]);
  const [eventVerwaltung, setEventVerwaltung] = useState<EventVerwaltung[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [skateparksSpotsData, eventVerwaltungData, anmeldungenData] = await Promise.all([
        LivingAppsService.getSkateparksSpots(),
        LivingAppsService.getEventVerwaltung(),
        LivingAppsService.getAnmeldungen(),
      ]);
      setSkateparksSpots(skateparksSpotsData);
      setEventVerwaltung(eventVerwaltungData);
      setAnmeldungen(anmeldungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [skateparksSpotsData, eventVerwaltungData, anmeldungenData] = await Promise.all([
          LivingAppsService.getSkateparksSpots(),
          LivingAppsService.getEventVerwaltung(),
          LivingAppsService.getAnmeldungen(),
        ]);
        setSkateparksSpots(skateparksSpotsData);
        setEventVerwaltung(eventVerwaltungData);
        setAnmeldungen(anmeldungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const skateparksSpotsMap = useMemo(() => {
    const m = new Map<string, SkateparksSpots>();
    skateparksSpots.forEach(r => m.set(r.record_id, r));
    return m;
  }, [skateparksSpots]);

  const eventVerwaltungMap = useMemo(() => {
    const m = new Map<string, EventVerwaltung>();
    eventVerwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [eventVerwaltung]);

  return { skateparksSpots, setSkateparksSpots, eventVerwaltung, setEventVerwaltung, anmeldungen, setAnmeldungen, loading, error, fetchAll, skateparksSpotsMap, eventVerwaltungMap };
}