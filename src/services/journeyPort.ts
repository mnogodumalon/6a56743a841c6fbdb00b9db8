/**
 * The INTERNAL door of the journey port — authenticated, via LivingAppsService.
 * GENERATED: one lister and one creator per entity. Do not edit.
 *
 *   import { servicePort } from '@/services/journeyPort';
 *
 * Intent pages hand this to `useJourneySubmit` and to shared step blocks. It
 * exposes only list · create · ref — the public subset — so a step written
 * against it also runs on a public page. Undo, edit and delete stay on the
 * page itself (LivingAppsService), never inside a shared step.
 */
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { toWirePayload, type JourneyPort, type JourneyRecord } from '@/lib/journey/port';
import type { EntityKey } from '@/lib/journey/rules';

type RawRecord = { record_id: string; fields: Record<string, unknown>; createdat?: string | null };
type RawMutation = { record_id: string; fields?: Record<string, unknown>; created_at?: string | null };

const listers: Record<EntityKey, () => Promise<RawRecord[]>> = {
  'skateparks_spots': () => LivingAppsService.getSkateparksSpots() as Promise<RawRecord[]>,
  'event_verwaltung': () => LivingAppsService.getEventVerwaltung() as Promise<RawRecord[]>,
  'anmeldungen': () => LivingAppsService.getAnmeldungen() as Promise<RawRecord[]>,
};

const creators: Record<EntityKey, (fields: Record<string, unknown>) => Promise<RawMutation>> = {
  'skateparks_spots': fields => LivingAppsService.createSkateparksSpot(fields as never),
  'event_verwaltung': fields => LivingAppsService.createEventVerwaltungEntry(fields as never),
  'anmeldungen': fields => LivingAppsService.createAnmeldungenEntry(fields as never),
};

export const servicePort: JourneyPort = {
  door: 'internal',
  async list(entity, opts) {
    const rows = await listers[entity]();
    const limited = opts?.limit ? rows.slice(0, opts.limit) : rows;
    return limited.map((r): JourneyRecord => ({ id: r.record_id, fields: r.fields ?? {}, createdAt: r.createdat ?? null }));
  },
  async create(entity, values) {
    const r = await creators[entity](toWirePayload(entity, values, servicePort));
    return { id: r.record_id, fields: r.fields ?? {}, createdAt: r.created_at ?? null };
  },
  ref: (appId, recordId) => createRecordUrl(appId, recordId),
};
