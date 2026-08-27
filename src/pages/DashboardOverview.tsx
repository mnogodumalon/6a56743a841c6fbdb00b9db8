import { useState, useMemo, useCallback } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedEventVerwaltung, EnrichedAnmeldungen } from '@/types/enriched';
import type { SkateparksSpots, EventVerwaltung, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import {
  RecordOverlayHost,
  RecordHeader,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { EventVerwaltungDetails } from '@/components/details/EventVerwaltungDetails';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { SkateparksSpotsDetails } from '@/components/details/SkateparksSpotsDetails';
import {
  CalendarWidget,
  type CalendarEvent,
} from '@/components/widgets/CalendarWidget';
import { EventVerwaltungDialog } from '@/components/dialogs/EventVerwaltungDialog';
import type { EventVerwaltungDialogDefaults } from '@/components/dialogs/EventVerwaltungDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import type { AnmeldungenDialogDefaults } from '@/components/dialogs/AnmeldungenDialog';
import { SkateparksSpotsDialog } from '@/components/dialogs/SkateparksSpotsDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import {
  IconCalendarEvent,
  IconUsers,
  IconMapPin,
  IconAlertTriangle,
  IconPlus,
} from '@tabler/icons-react';
import { dateFnsLocale, tx } from '@/i18n';

type OverlayItem =
  | { type: 'event'; id: string }
  | { type: 'anmeldung'; id: string }
  | { type: 'spot'; id: string };

export default function DashboardOverview() {
  const {
    skateparksSpots, setSkateparksSpots,
    eventVerwaltung, setEventVerwaltung,
    anmeldungen, setAnmeldungen,
    skateparksSpotsMap, eventVerwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const overlay = useRecordOverlayStack<OverlayItem>();

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventVerwaltung | null>(null);
  const [eventDefaults, setEventDefaults] = useState<EventVerwaltungDialogDefaults | undefined>(undefined);

  const [anmeldungDialogOpen, setAnmeldungDialogOpen] = useState(false);
  const [editingAnmeldung, setEditingAnmeldung] = useState<Anmeldungen | null>(null);
  const [anmeldungDefaults, setAnmeldungDefaults] = useState<AnmeldungenDialogDefaults | undefined>(undefined);

  const [spotDialogOpen, setSpotDialogOpen] = useState(false);

  const enrichedEventVerwaltung = enrichEventVerwaltung(eventVerwaltung, { skateparksSpotsMap });
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { eventVerwaltungMap });

  // CalendarWidget Events — useMemo MUSS vor den Early-Returns stehen (Rules of Hooks)
  const calEvents = useMemo<CalendarEvent[]>(
    () =>
      eventVerwaltung
        .filter(e => !!e.fields.datum_uhrzeit)
        .map(e => {
          const anmCount = anmeldungen.filter(a => extractRecordId(a.fields.event) === e.record_id).length;
          const maxT = e.fields.max_teilnehmer ?? 0;
          let tone: CalendarEvent['tone'] = 'primary';
          if (maxT > 0 && anmCount >= maxT) tone = 'destructive';
          else if (anmCount === 0) tone = 'warning';
          else tone = 'success';
          return {
            id: `event:${e.record_id}`,
            start: e.fields.datum_uhrzeit!,
            title: e.fields.titel ?? tx('Unbenannt'),
            subtitle: e.fields.kategorie?.label,
            tone,
          };
        }),
    [eventVerwaltung, anmeldungen],
  );

  // Drag-Reschedule (optimistic) — useCallback MUSS vor den Early-Returns stehen
  const rescheduleEvent = useCallback(async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!prev) return;
    const snapshot = [...eventVerwaltung];
    setEventVerwaltung(evs =>
      evs.map(e => e.record_id === rid ? { ...e, fields: { ...e.fields, datum_uhrzeit: newStart } } : e)
    );
    undoToast(tx`Event verschoben auf ${formatDateTime(newStart)}`, () => {
      setEventVerwaltung(snapshot);
      LivingAppsService.updateEventVerwaltungEntry(rid, { datum_uhrzeit: prev.fields.datum_uhrzeit }).catch(() => fetchAll());
    });
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { datum_uhrzeit: newStart });
    } catch {
      setEventVerwaltung(snapshot);
      fetchAll();
    }
  }, [eventVerwaltung, setEventVerwaltung, fetchAll]);

  // ─── Alle Hooks ÜBER den Early-Returns ───────────────────────────────────
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;
  // ─── Darunter nur noch Ableitungen ───────────────────────────────────────

  const today = startOfDay(clock);
  const in7days = addDays(today, 7);

  // Events mit Datum
  const kommende = enrichedEventVerwaltung
    .filter(e => e.fields.datum_uhrzeit && !isBefore(parseISO(e.fields.datum_uhrzeit), today))
    .sort((a, b) => (a.fields.datum_uhrzeit ?? '').localeCompare(b.fields.datum_uhrzeit ?? ''));

  const dieseWoche = kommende.filter(e =>
    e.fields.datum_uhrzeit && isBefore(parseISO(e.fields.datum_uhrzeit), in7days)
  );

  // Anmeldungen für Übersicht
  const totalAnmeldungen = anmeldungen.length;

  // HeroBanner: Events diese Woche ohne Anmeldungen
  const ohneAnmeldungen = dieseWoche.filter(e => {
    const count = anmeldungen.filter(a => extractRecordId(a.fields.event) === e.record_id).length;
    return count === 0;
  });

  // Context-Linie
  const kontextNamen = dieseWoche.slice(0, 3).map(e => e.fields.titel ?? '');
  const kontextLinie = dieseWoche.length > 0
    ? tx`${gruss(clock)} Diese Woche: ${namen(kontextNamen, 2)}${dieseWoche.length > 3 ? ` +${dieseWoche.length - 3} weitere` : ''}.`
    : tx`${gruss(clock)} Aktuell keine Events in Sicht — leg das nächste an!`;

  // Overlay-Helfer
  const openEventOverlay = (e: EventVerwaltung) => overlay.push({ type: 'event', id: e.record_id });
  const openAnmeldungOverlay = (a: Anmeldungen) => overlay.push({ type: 'anmeldung', id: a.record_id });
  const openSpotOverlay = (s: SkateparksSpots) => overlay.push({ type: 'spot', id: s.record_id });

  const openAddAnmeldung = (eventId?: string) => {
    setAnmeldungDefaults(eventId ? { event: eventId } : undefined);
    setEditingAnmeldung(null);
    setAnmeldungDialogOpen(true);
  };

  const openAddEvent = (ort?: string, datum?: string) => {
    setEventDefaults({ ort, datum_uhrzeit: datum });
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const openAddEventForSpot = (spotId: string) => {
    setEventDefaults({ ort: spotId });
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  return (
    <>
      {/* Seiten-Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{kontextLinie}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {eventVerwaltung.length} {tx('Events ·')} {totalAnmeldungen} {tx('Anmeldungen ·')} {skateparksSpots.length} {tx('Spots')}
            </p>
          </div>
          <button
            onClick={() => openAddEvent()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
          >
            <IconPlus size={16} className="shrink-0" />
            {tx('Neues Event')}
          </button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ohneAnmeldungen.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Anmeldung hinzufügen'),
                onClick: () => openAddAnmeldung(ohneAnmeldungen[0].record_id),
              }}
            >
              <b>{namen(ohneAnmeldungen.map(e => e.fields.titel ?? ''))}</b> {ohneAnmeldungen.length === 1 ? 'hat' : 'haben'} {tx('noch keine Anmeldungen diese Woche.')}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Diese Woche')}
              value={dieseWoche.length}
              icon={<IconCalendarEvent size={16} />}
              tone={dieseWoche.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Anmeldungen')}
              value={totalAnmeldungen}
              icon={<IconUsers size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Spots')}
              value={skateparksSpots.length}
              icon={<IconMapPin size={16} />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calEvents}
            locale={dateFnsLocale()}
            defaultView="month"
            onEventClick={ev => overlay.replace({ type: 'event', id: ev.id.split(':')[1] })}
            onEventDrop={rescheduleEvent}
            onEmptyClick={date => {
              openAddEvent(undefined, format(date, "yyyy-MM-dd'T'HH:mm"));
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Kommende Events')}
              items={kommende.slice(0, 8).map(e => {
                const anmCount = anmeldungen.filter(a => extractRecordId(a.fields.event) === e.record_id).length;
                const maxT = e.fields.max_teilnehmer;
                return {
                  id: e.record_id,
                  title: e.fields.titel ?? tx('Unbenannt'),
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">{formatDateTime(e.fields.datum_uhrzeit)}</span>
                      {e.fields.kategorie && (
                        <span className="text-muted-foreground"> · {e.fields.kategorie.label}</span>
                      )}
                      {' · '}
                      <span className={anmCount === 0 ? 'font-medium text-warning' : 'text-muted-foreground'}>
                        {anmCount}{maxT ? `/${maxT}` : ''} {tx('Anmeldungen')}
                      </span>
                    </>
                  ),
                  action: {
                    label: tx('+ Anmeldung'),
                    onClick: () => openAddAnmeldung(e.record_id),
                  },
                };
              })}
              onItemClick={id => {
                const ev = eventVerwaltung.find(e => e.record_id === id);
                if (ev) overlay.replace({ type: 'event', id: ev.record_id });
              }}
              empty={{
                text: tx('Noch keine Events geplant.'),
                action: { label: tx('Erstes Event anlegen'), onClick: () => openAddEvent() },
              }}
            />
            <WorkList
              title={tx('Neueste Anmeldungen')}
              items={[...enrichedAnmeldungen]
                .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''))
                .slice(0, 6)
                .map(a => ({
                  id: a.record_id,
                  title: `${a.fields.vorname ?? ''} ${a.fields.nachname ?? ''}`.trim() || tx('Unbekannt'),
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">{a.eventName || tx('Kein Event')}</span>
                      {a.fields.skill_level && (
                        <span className="text-muted-foreground"> · {a.fields.skill_level.label}</span>
                      )}
                    </>
                  ),
                }))}
              onItemClick={id => {
                const a = anmeldungen.find(x => x.record_id === id);
                if (a) overlay.replace({ type: 'anmeldung', id: a.record_id });
              }}
              empty={{
                text: tx('Noch keine Anmeldungen.'),
                action: { label: tx('Anmeldung erfassen'), onClick: () => openAddAnmeldung() },
              }}
            />
          </>
        }
      />

      {/* Overlay-Stack: ein einziger Shell für alle Typen */}
      <RecordOverlayHost
        overlay={overlay}
        render={top => {
          if (top.type === 'event') {
            const ev = eventVerwaltung.find(e => e.record_id === top.id);
            if (!ev) return null;
            return (
              <>
                <RecordHeader
                  title={ev.fields.titel ?? tx('Event')}
                  subtitle={ev.fields.kategorie?.label}
                  meta={formatDateTime(ev.fields.datum_uhrzeit)}
                />
                <EventVerwaltungDetails
                  record={ev}
                  skateparksSpotsList={skateparksSpots}
                  onOpenSkateparksSpots={openSpotOverlay}
                  anmeldungenList={anmeldungen}
                  onOpenAnmeldungen={openAnmeldungOverlay}
                  onAddAnmeldungen={() => openAddAnmeldung(ev.record_id)}
                />
              </>
            );
          }
          if (top.type === 'anmeldung') {
            const a = anmeldungen.find(x => x.record_id === top.id);
            if (!a) return null;
            const ev = eventVerwaltung.find(e => e.record_id === extractRecordId(a.fields.event));
            return (
              <>
                <RecordHeader
                  title={`${a.fields.vorname ?? ''} ${a.fields.nachname ?? ''}`.trim() || tx('Anmeldung')}
                  subtitle={ev?.fields.titel}
                  meta={a.fields.skill_level?.label}
                />
                <AnmeldungenDetails
                  record={a}
                  eventVerwaltungList={eventVerwaltung}
                  onOpenEventVerwaltung={openEventOverlay}
                />
              </>
            );
          }
          if (top.type === 'spot') {
            const spot = skateparksSpots.find(s => s.record_id === top.id);
            if (!spot) return null;
            return (
              <>
                <RecordHeader
                  title={spot.fields.name ?? tx('Spot')}
                  subtitle={[spot.fields.strasse, spot.fields.hausnummer].filter(Boolean).join(' ')}
                  meta={spot.fields.stadt}
                />
                <SkateparksSpotsDetails
                  record={spot}
                  eventVerwaltungList={eventVerwaltung}
                  onOpenEventVerwaltung={openEventOverlay}
                  onAddEventVerwaltung={() => openAddEventForSpot(spot.record_id)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={top => {
          if (top.type === 'event') {
            const ev = eventVerwaltung.find(e => e.record_id === top.id);
            if (ev) { setEditingEvent(ev); setEventDefaults(undefined); setEventDialogOpen(true); }
          } else if (top.type === 'anmeldung') {
            const a = anmeldungen.find(x => x.record_id === top.id);
            if (a) { setEditingAnmeldung(a); setAnmeldungDefaults(undefined); setAnmeldungDialogOpen(true); }
          }
        }}
      />

      {/* Dialoge */}
      <EventVerwaltungDialog
        open={eventDialogOpen}
        onClose={() => { setEventDialogOpen(false); setEditingEvent(null); setEventDefaults(undefined); }}
        onSubmit={async fields => {
          if (editingEvent) {
            await LivingAppsService.updateEventVerwaltungEntry(editingEvent.record_id, fields);
          } else {
            await LivingAppsService.createEventVerwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingEvent?.fields ?? eventDefaults}
        recordId={editingEvent?.record_id}
        skateparksSpotsList={skateparksSpots}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />

      <AnmeldungenDialog
        open={anmeldungDialogOpen}
        onClose={() => { setAnmeldungDialogOpen(false); setEditingAnmeldung(null); setAnmeldungDefaults(undefined); }}
        onSubmit={async fields => {
          if (editingAnmeldung) {
            await LivingAppsService.updateAnmeldungenEntry(editingAnmeldung.record_id, fields);
          } else {
            await LivingAppsService.createAnmeldungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingAnmeldung?.fields ?? anmeldungDefaults}
        recordId={editingAnmeldung?.record_id}
        eventVerwaltungList={eventVerwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />

      <SkateparksSpotsDialog
        open={spotDialogOpen}
        onClose={() => setSpotDialogOpen(false)}
        onSubmit={async fields => {
          await LivingAppsService.createSkateparksSpot(fields);
          fetchAll();
        }}
        enablePhotoScan={AI_PHOTO_SCAN['SkateparksSpots']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SkateparksSpots']}
      />
    </>
  );
}
