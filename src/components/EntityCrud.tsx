/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'skateparksSpots'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.skateparksSpots.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.skateparksSpots.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.skateparksSpots.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.skateparksSpots              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   skateparks_spots: name, strasse, hausnummer, postleitzahl, stadt, beschreibung, untergrundtyp, standort, …  ·  ← event_verwaltung (list + contextual +)
 *   event_verwaltung: titel, kategorie, datum_uhrzeit, beschreibung, skill_level, max_teilnehmer, startgebuehr, ort, …  ·  → skateparks_spots · ← anmeldungen (list + contextual +)
 *   anmeldungen: event, vorname, nachname, geburtsdatum, email, telefon, skill_level, board_stil, …  ·  → event_verwaltung
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { SkateparksSpots, EventVerwaltung, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichEventVerwaltung, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedEventVerwaltung, EnrichedAnmeldungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { SkateparksSpotsDialog, type SkateparksSpotsDialogDefaults } from '@/components/dialogs/SkateparksSpotsDialog';
import { SkateparksSpotsDetails } from '@/components/details/SkateparksSpotsDetails';
import { EventVerwaltungDialog, type EventVerwaltungDialogDefaults } from '@/components/dialogs/EventVerwaltungDialog';
import { EventVerwaltungDetails } from '@/components/details/EventVerwaltungDetails';
import { AnmeldungenDialog, type AnmeldungenDialogDefaults } from '@/components/dialogs/AnmeldungenDialog';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'skateparksSpots'; record: SkateparksSpots }
  | { type: 'eventVerwaltung'; record: EnrichedEventVerwaltung }
  | { type: 'anmeldungen'; record: EnrichedAnmeldungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  skateparksSpots: EntityCrudApi<SkateparksSpots, SkateparksSpotsDialogDefaults>;
  eventVerwaltung: EntityCrudApi<EventVerwaltung, EventVerwaltungDialogDefaults>;
  anmeldungen: EntityCrudApi<Anmeldungen, AnmeldungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { skateparksSpots: SkateparksSpots[]; eventVerwaltung: EnrichedEventVerwaltung[]; anmeldungen: EnrichedAnmeldungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [skateparksSpotsDialog, setSkateparksSpotsDialog] = useState<{ defaults?: SkateparksSpotsDialogDefaults; editing?: SkateparksSpots } | null>(null);
  const [eventVerwaltungDialog, setEventVerwaltungDialog] = useState<{ defaults?: EventVerwaltungDialogDefaults; editing?: EventVerwaltung } | null>(null);
  const [anmeldungenDialog, setAnmeldungenDialog] = useState<{ defaults?: AnmeldungenDialogDefaults; editing?: Anmeldungen } | null>(null);
  const enrichedEventVerwaltung = useMemo(() => enrichEventVerwaltung(data.eventVerwaltung, { skateparksSpotsMap: data.skateparksSpotsMap }), [data.eventVerwaltung, data.skateparksSpotsMap]);
  const enrichedAnmeldungen = useMemo(() => enrichAnmeldungen(data.anmeldungen, { eventVerwaltungMap: data.eventVerwaltungMap }), [data.anmeldungen, data.eventVerwaltungMap]);

  function detailSkateparksSpots(record: SkateparksSpots, push = false) {
    const item: OverlayItem = { type: 'skateparksSpots', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitSkateparksSpots(fields: SkateparksSpots['fields']) {
    const editing = skateparksSpotsDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setSkateparksSpots(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateSkateparksSpot(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('skateparks_spots')} — ${t('crud_updated')}`, async () => {
        data.setSkateparksSpots(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateSkateparksSpot(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createSkateparksSpot(fields);
      undoToast(`${appLabel('skateparks_spots')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailEventVerwaltung(record: EventVerwaltung, push = false) {
    const rec = enrichedEventVerwaltung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'eventVerwaltung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitEventVerwaltung(fields: EventVerwaltung['fields']) {
    const editing = eventVerwaltungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setEventVerwaltung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateEventVerwaltungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('event_verwaltung')} — ${t('crud_updated')}`, async () => {
        data.setEventVerwaltung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateEventVerwaltungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createEventVerwaltungEntry(fields);
      undoToast(`${appLabel('event_verwaltung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnmeldungen(record: Anmeldungen, push = false) {
    const rec = enrichedAnmeldungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'anmeldungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnmeldungen(fields: Anmeldungen['fields']) {
    const editing = anmeldungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnmeldungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnmeldungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_updated')}`, async () => {
        data.setAnmeldungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnmeldungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnmeldungenEntry(fields);
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <SkateparksSpotsDialog
        open={skateparksSpotsDialog !== null}
        onClose={() => setSkateparksSpotsDialog(null)}
        onSubmit={submitSkateparksSpots}
        defaultValues={skateparksSpotsDialog?.defaults}
        recordId={skateparksSpotsDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['SkateparksSpots']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SkateparksSpots']}
      />
      <EventVerwaltungDialog
        open={eventVerwaltungDialog !== null}
        onClose={() => setEventVerwaltungDialog(null)}
        onSubmit={submitEventVerwaltung}
        defaultValues={eventVerwaltungDialog?.defaults}
        recordId={eventVerwaltungDialog?.editing?.record_id}
        skateparksSpotsList={data.skateparksSpots}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />
      <AnmeldungenDialog
        open={anmeldungenDialog !== null}
        onClose={() => setAnmeldungenDialog(null)}
        onSubmit={submitAnmeldungen}
        defaultValues={anmeldungenDialog?.defaults}
        recordId={anmeldungenDialog?.editing?.record_id}
        eventVerwaltungList={data.eventVerwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'skateparksSpots') {
            return (
              <>
                <RecordHeader title={top.record.fields.name ?? appLabel('skateparks_spots')} subtitle={undefined} />
                <SkateparksSpotsDetails
                  record={top.record}
                  eventVerwaltungList={data.eventVerwaltung}
                  onOpenEventVerwaltung={(r) => detailEventVerwaltung(r, true)}
                  onAddEventVerwaltung={() => setEventVerwaltungDialog({ defaults: { ort: createRecordUrl(APP_IDS.SKATEPARKS_SPOTS, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'eventVerwaltung') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('event_verwaltung')} subtitle={top.record.fields.datum_uhrzeit ? formatDate(top.record.fields.datum_uhrzeit) : undefined} />
                <EventVerwaltungDetails
                  record={top.record}
                  skateparksSpotsList={data.skateparksSpots}
                  onOpenSkateparksSpots={(r) => detailSkateparksSpots(r, true)}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={() => setAnmeldungenDialog({ defaults: { event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'anmeldungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('anmeldungen')} subtitle={top.record.fields.geburtsdatum ? formatDate(top.record.fields.geburtsdatum) : undefined} />
                <AnmeldungenDetails
                  record={top.record}
                  eventVerwaltungList={data.eventVerwaltung}
                  onOpenEventVerwaltung={(r) => detailEventVerwaltung(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'skateparksSpots') setSkateparksSpotsDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'eventVerwaltung') setEventVerwaltungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'anmeldungen') setAnmeldungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    skateparksSpots: {
      openCreate: (defaults?: SkateparksSpotsDialogDefaults) => setSkateparksSpotsDialog({ defaults }),
      openEdit: (record: SkateparksSpots) => setSkateparksSpotsDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: SkateparksSpots) => detailSkateparksSpots(record, false),
    },
    eventVerwaltung: {
      openCreate: (defaults?: EventVerwaltungDialogDefaults) => setEventVerwaltungDialog({ defaults }),
      openEdit: (record: EventVerwaltung) => setEventVerwaltungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: EventVerwaltung) => detailEventVerwaltung(record, false),
    },
    anmeldungen: {
      openCreate: (defaults?: AnmeldungenDialogDefaults) => setAnmeldungenDialog({ defaults }),
      openEdit: (record: Anmeldungen) => setAnmeldungenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Anmeldungen) => detailAnmeldungen(record, false),
    },
    enriched: { skateparksSpots: data.skateparksSpots, eventVerwaltung: enrichedEventVerwaltung, anmeldungen: enrichedAnmeldungen },
  };
}
