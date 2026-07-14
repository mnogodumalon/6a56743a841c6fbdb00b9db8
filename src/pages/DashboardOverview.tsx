import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichEventVerwaltung, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedEventVerwaltung } from '@/types/enriched';
import type { SkateparksSpots, EventVerwaltung, Anmeldungen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDateTime } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconCalendarEvent, IconMapPin, IconUsers, IconPlus,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isAfter, isBefore, startOfToday, endOfDay, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import {
  CalendarWidget,
  CalendarSkeleton,
  type CalendarEvent,
} from '@/components/widgets/CalendarWidget';
import {
  MapWidget,
  MapSkeleton,
  type MapMarker,
} from '@/components/widgets/MapWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { EventVerwaltungDetails } from '@/components/details/EventVerwaltungDetails';
import { SkateparksSpotsDetails } from '@/components/details/SkateparksSpotsDetails';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { EventVerwaltungDialog } from '@/components/dialogs/EventVerwaltungDialog';
import { SkateparksSpotsDialog } from '@/components/dialogs/SkateparksSpotsDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a56743a841c6fbdb00b9db8';
const REPAIR_ENDPOINT = '/claude/build/repair';

// --- Overlay stack item types ---
type OverlayItem =
  | { type: 'event'; id: string }
  | { type: 'spot'; id: string }
  | { type: 'anmeldung'; id: string };

// --- Tone helper for events ---
function eventTone(ev: EventVerwaltung): CalendarEvent['tone'] {
  if (!ev.fields.datum_uhrzeit) return 'warning';
  const d = parseISO(ev.fields.datum_uhrzeit);
  const today = startOfToday();
  if (isBefore(d, today)) return 'default';
  const inWeek = addDays(today, 7);
  if (isBefore(d, inWeek)) return 'primary';
  return 'success';
}

// --- Tone for spots ---
function spotTone(spot: SkateparksSpots): MapMarker['tone'] {
  const type = spot.fields.untergrundtyp?.key;
  if (type === 'beton') return 'primary';
  if (type === 'asphalt') return 'success';
  if (type === 'holz') return 'warning';
  return 'default';
}

export default function DashboardOverview() {
  const {
    skateparksSpots, setSkateparksSpots,
    eventVerwaltung, setEventVerwaltung,
    anmeldungen,
    skateparksSpotsMap, eventVerwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();

  const enrichedEventVerwaltung = enrichEventVerwaltung(eventVerwaltung, { skateparksSpotsMap });
  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { eventVerwaltungMap });

  // --- Overlay stack (all entity types share one host) ---
  const overlay = useRecordOverlayStack<OverlayItem>();

  // --- Dialog state ---
  const [eventDialog, setEventDialog] = useState<{
    open: boolean;
    record?: EnrichedEventVerwaltung;
    defaults?: Partial<EventVerwaltung['fields']>;
  }>({ open: false });
  const [spotDialog, setSpotDialog] = useState<{
    open: boolean;
    record?: SkateparksSpots;
    defaults?: Partial<SkateparksSpots['fields']>;
  }>({ open: false });
  const [anmeldungDialog, setAnmeldungDialog] = useState<{
    open: boolean;
    record?: Anmeldungen;
    defaults?: Partial<Anmeldungen['fields']>;
  }>({ open: false });

  // --- KPI filter ---
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('all');

  // --- Derived data (all hooks before any early return) ---
  const today = useMemo(() => format(clock, 'yyyy-MM-dd'), [clock]);
  const todayEnd = useMemo(() => endOfDay(clock), [clock]);
  const nextWeek = useMemo(() => addDays(clock, 7), [clock]);

  const upcomingEvents = useMemo(() =>
    enrichedEventVerwaltung
      .filter(ev => ev.fields.datum_uhrzeit && isAfter(parseISO(ev.fields.datum_uhrzeit), clock))
      .sort((a, b) => (a.fields.datum_uhrzeit ?? '').localeCompare(b.fields.datum_uhrzeit ?? '')),
    [enrichedEventVerwaltung, clock]
  );

  const todayEvents = useMemo(() =>
    enrichedEventVerwaltung.filter(ev => {
      if (!ev.fields.datum_uhrzeit) return false;
      const d = parseISO(ev.fields.datum_uhrzeit);
      return !isBefore(d, clock) && isBefore(d, todayEnd);
    }),
    [enrichedEventVerwaltung, clock, todayEnd]
  );

  const thisWeekEvents = useMemo(() =>
    enrichedEventVerwaltung.filter(ev => {
      if (!ev.fields.datum_uhrzeit) return false;
      const d = parseISO(ev.fields.datum_uhrzeit);
      return isAfter(d, clock) && isBefore(d, nextWeek);
    }),
    [enrichedEventVerwaltung, clock, nextWeek]
  );

  // Anmeldungen count per event
  const anmeldungenPerEvent = useMemo(() => {
    const m = new Map<string, number>();
    anmeldungen.forEach(a => {
      const evId = extractRecordId(a.fields.event);
      if (evId) m.set(evId, (m.get(evId) ?? 0) + 1);
    });
    return m;
  }, [anmeldungen]);

  // Calendar events
  const calendarEvents = useMemo<CalendarEvent[]>(() =>
    enrichedEventVerwaltung
      .filter(ev => !!ev.fields.datum_uhrzeit)
      .map(ev => ({
        id: `event:${ev.record_id}`,
        start: ev.fields.datum_uhrzeit!,
        allDay: false,
        title: ev.fields.titel ?? 'Unbenanntes Event',
        subtitle: ev.ortName || ev.fields.kategorie?.label,
        tone: eventTone(ev),
      })),
    [enrichedEventVerwaltung]
  );

  // Map markers for spots
  const mapMarkers = useMemo<MapMarker[]>(() =>
    skateparksSpots.flatMap(s => {
      const geo = s.fields.standort;
      if (!geo) return [];
      return [{
        id: `spot:${s.record_id}`,
        lat: geo.lat,
        long: geo.long,
        title: s.fields.name ?? 'Unbekannter Spot',
        subtitle: geo.info ?? [s.fields.strasse, s.fields.stadt].filter(Boolean).join(', '),
        tone: spotTone(s),
        icon: 'map' as const,
      }];
    }),
    [skateparksSpots]
  );

  // Aside: nächste Events als WorkList
  const workItems = useMemo(() => {
    const source = filter === 'today' ? todayEvents
      : filter === 'upcoming' ? thisWeekEvents
      : upcomingEvents;
    return source.slice(0, 8).map(ev => {
      const count = anmeldungenPerEvent.get(ev.record_id) ?? 0;
      const max = ev.fields.max_teilnehmer;
      const isFull = max != null && count >= max;
      return {
        id: ev.record_id,
        title: ev.fields.titel ?? 'Unbenanntes Event',
        icon: <IconCalendarEvent size={16} className="shrink-0 text-muted-foreground" />,
        secondLine: (
          <>
            <span className={isFull ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              {isFull ? 'Ausgebucht' : ev.fields.kategorie?.label ?? '—'}
            </span>
            {ev.fields.datum_uhrzeit && (
              <span className="text-muted-foreground">
                {' · '}
                {format(parseISO(ev.fields.datum_uhrzeit), 'E dd.MM. HH:mm', { locale: de })}
              </span>
            )}
            {count > 0 && (
              <span className="text-muted-foreground"> · {count} Anmeldung{count !== 1 ? 'en' : ''}</span>
            )}
          </>
        ),
        action: {
          label: <><IconPlus size={14} className="shrink-0" /> Anmelden</>,
          onClick: () => setAnmeldungDialog({
            open: true,
            defaults: { event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, ev.record_id) },
          }),
        },
      };
    });
  }, [filter, todayEvents, thisWeekEvents, upcomingEvents, anmeldungenPerEvent]);

  // Hero: Events in Kürze ohne Ort
  const eventsOhneOrt = useMemo(() =>
    upcomingEvents.filter(ev => !ev.fields.ort).slice(0, 3),
    [upcomingEvents]
  );

  // --- Reschedule via drag ---
  const reschedule = useCallback(async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = eventVerwaltung.find(ev => ev.record_id === rid);
    if (!prev) return;
    setEventVerwaltung(evs => evs.map(ev =>
      ev.record_id === rid ? { ...ev, fields: { ...ev.fields, datum_uhrzeit: newStart } } : ev
    ));
    try {
      await LivingAppsService.updateEventVerwaltungEntry(rid, { datum_uhrzeit: newStart });
      undoToast('Datum verschoben', async () => {
        setEventVerwaltung(evs => evs.map(ev =>
          ev.record_id === rid ? { ...ev, fields: { ...ev.fields, datum_uhrzeit: prev.fields.datum_uhrzeit } } : ev
        ));
        await LivingAppsService.updateEventVerwaltungEntry(rid, { datum_uhrzeit: prev.fields.datum_uhrzeit });
      });
    } catch {
      await fetchAll();
    }
  }, [eventVerwaltung, setEventVerwaltung, fetchAll]);

  // --- Overlay helpers ---
  const openEventOverlay = useCallback((id: string) => overlay.push({ type: 'event', id }), [overlay]);
  const openSpotOverlay = useCallback((id: string) => overlay.push({ type: 'spot', id }), [overlay]);

  // --- Resolve current overlay record ---
  const top = overlay.top;
  const topEvent = top?.type === 'event' ? (eventVerwaltungMap.get(top.id) ?? null) : null;
  const topSpot = top?.type === 'spot' ? (skateparksSpotsMap.get(top.id) ?? null) : null;
  const topAnmeldung = top?.type === 'anmeldung'
    ? (anmeldungen.find(a => a.record_id === top.id) ?? null) : null;

  // Context line
  const contextLine = useMemo(() => {
    if (todayEvents.length > 0) {
      const titles = todayEvents.map(ev => ev.fields.titel ?? '').filter(Boolean);
      return `${namen(titles)} heute — ${upcomingEvents.length} Events demnächst.`;
    }
    if (upcomingEvents.length > 0) {
      const next = upcomingEvents[0];
      const nextDate = next.fields.datum_uhrzeit
        ? format(parseISO(next.fields.datum_uhrzeit), 'E dd.MM.', { locale: de })
        : '';
      return `Nächstes Event: ${next.fields.titel ?? '—'} am ${nextDate}.`;
    }
    return 'Noch keine Events geplant — leg gleich los!';
  }, [todayEvents, upcomingEvents]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Empty state
  if (eventVerwaltung.length === 0 && skateparksSpots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <IconCalendarEvent size={48} className="text-muted-foreground" stroke={1.5} />
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Skateboard Events einrichten</h1>
          <p className="text-muted-foreground max-w-sm">
            Leg zuerst Skateparks &amp; Spots an, dann kannst du Events und Anmeldungen verwalten.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button onClick={() => setSpotDialog({ open: true })}>
            <IconMapPin size={16} className="mr-2" /> Ersten Spot anlegen
          </Button>
          <Button variant="outline" onClick={() => setEventDialog({ open: true })}>
            <IconPlus size={16} className="mr-2" /> Event anlegen
          </Button>
        </div>
        <SkateparksSpotsDialog
          open={spotDialog.open}
          onClose={() => setSpotDialog({ open: false })}
          onSubmit={async (fields) => { await LivingAppsService.createSkateparksSpot(fields); fetchAll(); }}
          enablePhotoScan={AI_PHOTO_SCAN['SkateparksSpots']}
          enablePhotoLocation={AI_PHOTO_LOCATION['SkateparksSpots']}
        />
        <EventVerwaltungDialog
          open={eventDialog.open}
          onClose={() => setEventDialog({ open: false })}
          onSubmit={async (fields) => { await LivingAppsService.createEventVerwaltungEntry(fields); fetchAll(); }}
          skateparksSpotsList={skateparksSpots}
          enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
        />
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <Button onClick={() => setEventDialog({ open: true })}>
          <IconPlus size={16} className="mr-2" /> Neues Event
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={eventsOhneOrt.length > 0 ? (
          <HeroBanner
            tone="warning"
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: 'Ort zuweisen',
              onClick: () => setEventDialog({ open: true, record: enrichedEventVerwaltung.find(ev => ev.record_id === eventsOhneOrt[0].record_id) }),
            }}
          >
            <b>{namen(eventsOhneOrt.map(ev => ev.fields.titel ?? ''))}</b>{' '}
            {eventsOhneOrt.length === 1 ? 'hat' : 'haben'} noch keinen Ort zugewiesen.
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title="Vergangen"
              value={enrichedEventVerwaltung.filter(ev => ev.fields.datum_uhrzeit && isBefore(parseISO(ev.fields.datum_uhrzeit), clock)).length}
              icon={<IconCalendarEvent size={18} />}
            />
            <StatStripItem
              title="Heute"
              value={todayEvents.length}
              icon={<IconCalendarEvent size={18} />}
              tone={todayEvents.length > 0 ? 'primary' : 'default'}
              onClick={() => setFilter(f => f === 'today' ? 'all' : 'today')}
              active={filter === 'today'}
            />
            <StatStripItem
              title="Diese Woche"
              value={thisWeekEvents.length}
              icon={<IconCalendarEvent size={18} />}
              tone={thisWeekEvents.length > 0 ? 'success' : 'default'}
              onClick={() => setFilter(f => f === 'upcoming' ? 'all' : 'upcoming')}
              active={filter === 'upcoming'}
            />
            <StatStripItem
              title="Spots"
              value={skateparksSpots.length}
              icon={<IconMapPin size={18} />}
            />
            <StatStripItem
              title="Anmeldungen"
              value={anmeldungen.length}
              icon={<IconUsers size={18} />}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            locale={de}
            defaultView="month"
            onEventClick={ev => openEventOverlay(ev.id.split(':')[1])}
            onEmptyClick={date => {
              setEventDialog({
                open: true,
                defaults: {
                  datum_uhrzeit: format(date, "yyyy-MM-dd'T'HH:mm"),
                },
              });
            }}
            onEventDrop={reschedule}
          />
        }
        aside={
          <>
            <WorkList
              title={filter === 'today' ? 'Heute' : filter === 'upcoming' ? 'Diese Woche' : 'Demnächst'}
              icon={<IconCalendarEvent size={14} />}
              items={workItems}
              onItemClick={id => openEventOverlay(id)}
              empty={
                upcomingEvents.length === 0
                  ? {
                      text: 'Keine bevorstehenden Events — plane das nächste!',
                      action: { label: 'Neues Event', onClick: () => setEventDialog({ open: true }) },
                    }
                  : { text: `Keine Events im gewählten Zeitraum.` }
              }
            />
            {mapMarkers.length > 0 ? (
              <MapWidget
                markers={mapMarkers}
                onMarkerClick={m => openSpotOverlay(m.id.split(':')[1])}
                onMapPointClick={({ lat, long }) =>
                  setSpotDialog({
                    open: true,
                    defaults: { standort: { lat, long } },
                  })
                }
                legend={[
                  { label: 'Beton', tone: 'primary' },
                  { label: 'Asphalt', tone: 'success' },
                  { label: 'Holz', tone: 'warning' },
                  { label: 'Sonstiges', tone: 'default' },
                ]}
              />
            ) : (
              <div className="rounded-[27px] bg-card p-5 shadow-lg flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
                <IconMapPin size={32} className="text-muted-foreground" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Noch keine Spots mit Standort.</p>
                <Button size="sm" variant="outline" onClick={() => setSpotDialog({ open: true })}>
                  <IconPlus size={14} className="mr-1" /> Spot anlegen
                </Button>
              </div>
            )}
          </>
        }
      />

      {/* === Overlay Host — single RecordOverlay shell for all types === */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        onBack={overlay.canGoBack ? overlay.pop : undefined}
        onEdit={
          topEvent ? () => setEventDialog({ open: true, record: enrichedEventVerwaltung.find(ev => ev.record_id === topEvent.record_id) }) :
          topSpot ? () => setSpotDialog({ open: true, record: topSpot }) :
          topAnmeldung ? () => setAnmeldungDialog({ open: true, record: topAnmeldung }) :
          undefined
        }
        footer={
          topEvent ? (
            <Button size="sm" onClick={() => {
              if (!topEvent) return;
              setAnmeldungDialog({
                open: true,
                defaults: { event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, topEvent.record_id) },
              });
            }}>
              <IconPlus size={14} className="mr-1.5" /> Anmeldung hinzufügen
            </Button>
          ) : undefined
        }
      >
        {topEvent && (
          <>
            <RecordHeader
              title={topEvent.fields.titel ?? 'Unbenanntes Event'}
              subtitle={
                topEvent.fields.datum_uhrzeit
                  ? formatDateTime(topEvent.fields.datum_uhrzeit)
                  : undefined
              }
              badges={topEvent.fields.kategorie ? [topEvent.fields.kategorie.label] : undefined}
            />
            <EventVerwaltungDetails
              record={topEvent}
              skateparksSpotsList={skateparksSpots}
              onOpenSkateparksSpots={s => overlay.push({ type: 'spot', id: s.record_id })}
              anmeldungenList={anmeldungen}
              onOpenAnmeldungen={a => overlay.push({ type: 'anmeldung', id: a.record_id })}
              onAddAnmeldungen={() => setAnmeldungDialog({
                open: true,
                defaults: { event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, topEvent.record_id) },
              })}
            />
          </>
        )}
        {topSpot && (
          <>
            <RecordHeader
              title={topSpot.fields.name ?? 'Unbekannter Spot'}
              subtitle={[topSpot.fields.strasse, topSpot.fields.stadt].filter(Boolean).join(', ')}
              badges={topSpot.fields.untergrundtyp ? [topSpot.fields.untergrundtyp.label] : undefined}
            />
            <SkateparksSpotsDetails
              record={topSpot}
              eventVerwaltungList={eventVerwaltung}
              onOpenEventVerwaltung={ev => overlay.push({ type: 'event', id: ev.record_id })}
              onAddEventVerwaltung={() => {
                const ort = createRecordUrl(APP_IDS.SKATEPARKS_SPOTS, topSpot.record_id);
                setEventDialog({ open: true, defaults: { ort } });
              }}
            />
            <RecordAttachments appId={APP_IDS.SKATEPARKS_SPOTS} recordId={topSpot.record_id} />
          </>
        )}
        {topAnmeldung && (
          <>
            <RecordHeader
              title={[topAnmeldung.fields.vorname, topAnmeldung.fields.nachname].filter(Boolean).join(' ') || 'Anmeldung'}
              subtitle={topAnmeldung.fields.email}
              badges={topAnmeldung.fields.skill_level ? [topAnmeldung.fields.skill_level.label] : undefined}
            />
            <AnmeldungenDetails
              record={topAnmeldung}
              eventVerwaltungList={eventVerwaltung}
              onOpenEventVerwaltung={ev => overlay.push({ type: 'event', id: ev.record_id })}
            />
          </>
        )}
      </RecordOverlay>

      {/* === Dialogs === */}
      <EventVerwaltungDialog
        open={eventDialog.open}
        onClose={() => setEventDialog({ open: false })}
        onSubmit={async (fields) => {
          if (eventDialog.record) {
            await LivingAppsService.updateEventVerwaltungEntry(eventDialog.record.record_id, fields);
            undoToast('Event aktualisiert');
          } else {
            await LivingAppsService.createEventVerwaltungEntry(fields);
            undoToast('Event erstellt');
          }
          fetchAll();
        }}
        defaultValues={eventDialog.record?.fields ?? eventDialog.defaults}
        recordId={eventDialog.record?.record_id}
        skateparksSpotsList={skateparksSpots}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />

      <SkateparksSpotsDialog
        open={spotDialog.open}
        onClose={() => setSpotDialog({ open: false })}
        onSubmit={async (fields) => {
          if (spotDialog.record) {
            await LivingAppsService.updateSkateparksSpot(spotDialog.record.record_id, fields);
            undoToast('Spot aktualisiert');
          } else {
            await LivingAppsService.createSkateparksSpot(fields);
            undoToast('Spot erstellt');
          }
          fetchAll();
        }}
        defaultValues={spotDialog.record?.fields ?? spotDialog.defaults}
        recordId={spotDialog.record?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['SkateparksSpots']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SkateparksSpots']}
      />

      <AnmeldungenDialog
        open={anmeldungDialog.open}
        onClose={() => setAnmeldungDialog({ open: false })}
        onSubmit={async (fields) => {
          if (anmeldungDialog.record) {
            await LivingAppsService.updateAnmeldungenEntry(anmeldungDialog.record.record_id, fields);
            undoToast('Anmeldung aktualisiert');
          } else {
            await LivingAppsService.createAnmeldungenEntry(fields);
            undoToast('Anmeldung erstellt');
          }
          fetchAll();
        }}
        defaultValues={anmeldungDialog.record?.fields ?? anmeldungDialog.defaults}
        recordId={anmeldungDialog.record?.record_id}
        eventVerwaltungList={eventVerwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
    </>
  );
}

// ---- Skeleton & Error ----

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <CalendarSkeleton />
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-2xl" />
        <MapSkeleton />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
