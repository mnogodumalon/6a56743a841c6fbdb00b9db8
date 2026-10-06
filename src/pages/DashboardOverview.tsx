import { useMemo, useState } from 'react';
import { format, parseISO, addDays, isBefore, isAfter, isSameDay } from 'date-fns';
import { IconPlus, IconAlertTriangle, IconCalendarEvent, IconMapPin } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCardRow, StatCard } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { skateparksSpots, anmeldungen, eventVerwaltung, setEventVerwaltung, fetchAll } = data;
  const crud = useEntityCrud(data);
  const enrichedEvents = crud.enriched.eventVerwaltung;
  const clock = useClock();
  const [onlyEmpty, setOnlyEmpty] = useState(false);

  const todayKey = format(clock, 'yyyy-MM-dd');

  // Anmeldungen je Event
  const countByEvent = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of anmeldungen) {
      const id = extractRecordId(a.fields.event);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [anmeldungen]);

  const upcoming = useMemo(
    () =>
      enrichedEvents
        .filter(e => e.fields.datum_uhrzeit && (e.fields.datum_uhrzeit.slice(0, 10) >= todayKey))
        .sort((a, b) => (a.fields.datum_uhrzeit ?? '').localeCompare(b.fields.datum_uhrzeit ?? '')),
    [enrichedEvents, todayKey],
  );

  const overbooked = upcoming.filter(e => {
    const max = e.fields.max_teilnehmer;
    return max != null && max > 0 && (countByEvent.get(e.record_id) ?? 0) > max;
  });
  const withoutSignups = upcoming.filter(e => (countByEvent.get(e.record_id) ?? 0) === 0);

  const capacityEvents = upcoming.filter(e => (e.fields.max_teilnehmer ?? 0) > 0);
  const capacity = capacityEvents.reduce((s, e) => s + (e.fields.max_teilnehmer ?? 0), 0);
  const taken = capacityEvents.reduce((s, e) => s + (countByEvent.get(e.record_id) ?? 0), 0);
  const pct = capacity > 0 ? Math.round((taken / capacity) * 100) : 0;

  const shownEvents = onlyEmpty ? withoutSignups : upcoming;
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const src = onlyEmpty ? withoutSignups : enrichedEvents;
    return src
      .filter(e => !!e.fields.datum_uhrzeit)
      .map(e => {
        const n = countByEvent.get(e.record_id) ?? 0;
        const max = e.fields.max_teilnehmer;
        const full = max != null && max > 0 && n >= max;
        return {
          id: `event:${e.record_id}`,
          start: e.fields.datum_uhrzeit!.slice(0, 16),
          title: e.fields.titel ?? '—',
          subtitle: max ? `${n}/${max}` : `${n}`,
          tone: full ? 'warning' : n === 0 ? 'default' : 'primary',
        } as CalendarEvent;
      });
  }, [enrichedEvents, withoutSignups, onlyEmpty, countByEvent]);

  const reschedule = (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    const prev = eventVerwaltung.find(e => e.record_id === rid);
    if (!rid || !prev) return;
    const oldStart = prev.fields.datum_uhrzeit;
    setEventVerwaltung(list => list.map(e => (e.record_id === rid ? { ...e, fields: { ...e.fields, datum_uhrzeit: newStart } } : e)));
    LivingAppsService.updateEventVerwaltungEntry(rid, { datum_uhrzeit: newStart }).catch(() => fetchAll());
    undoToast(tx`${prev.fields.titel ?? ''} verschoben`, () => {
      setEventVerwaltung(list => list.map(e => (e.record_id === rid ? { ...e, fields: { ...e.fields, datum_uhrzeit: oldStart } } : e)));
      LivingAppsService.updateEventVerwaltungEntry(rid, { datum_uhrzeit: oldStart }).catch(() => fetchAll());
    });
  };

  // Kontext-Zeile
  const next = upcoming[0];
  const soon = upcoming.filter(e => e.fields.datum_uhrzeit && isBefore(parseISO(e.fields.datum_uhrzeit), addDays(clock, 7)) && isAfter(parseISO(e.fields.datum_uhrzeit), addDays(clock, -1)));
  let context: string;
  if (next && next.fields.datum_uhrzeit) {
    const d = parseISO(next.fields.datum_uhrzeit);
    const when = isSameDay(d, clock) ? tx('heute') : format(d, 'EEEE, d. MMM', { locale: dateFnsLocale() });
    const n = countByEvent.get(next.record_id) ?? 0;
    context = tx`Als Nächstes: ${next.fields.titel ?? ''} (${when}) mit ${n} Anmeldungen.`;
    if (soon.length > 1) context += ' ' + tx`In den nächsten 7 Tagen: ${namen(soon.map(e => e.fields.titel ?? ''))}.`;
  } else {
    context = tx('Aktuell sind keine kommenden Events geplant.');
  }

  // Orte mit kommenden Events
  const spotItems = skateparksSpots.map(s => ({
    s,
    n: upcoming.filter(e => extractRecordId(e.fields.ort) === s.record_id).length,
  })).sort((a, b) => b.n - a.n);

  const hasEvents = eventVerwaltung.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{context}</p>
        </div>
        {crud.eventVerwaltung.canWrite && (
          <Button onClick={() => crud.eventVerwaltung.openCreate({})}>
            <IconPlus size={16} className="shrink-0 mr-1" />
            {tx('Neues Event')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="split"
        hero={
          overbooked.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{ label: tx('Event anpassen'), onClick: () => crud.eventVerwaltung.openEdit(overbooked[0]) }}
            >
              {tx`${namen(overbooked.map(e => e.fields.titel ?? ''))} überbucht — mehr Anmeldungen als Plätze.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          hasEvents ? (
            <StatCardRow>
              <StatCard
                title={tx('Kommende Events')}
                value={upcoming.length}
                description={next ? tx`Nächstes: ${formatDate(next.fields.datum_uhrzeit)}` : tx('Noch nichts geplant')}
                icon={<IconCalendarEvent size={18} className="text-muted-foreground" />}
              />
              <StatCard
                title={tx('Plätze belegt')}
                value={capacity > 0 ? `${pct} %` : '—'}
                description={tx`${taken} von ${capacity} Plätzen`}
              />
              <StatCard
                title={tx('Ohne Anmeldung')}
                value={withoutSignups.length}
                description={withoutSignups.length > 0 ? tx('Noch keine Teilnehmer') : tx('Alle Events haben Anmeldungen')}
                tone={withoutSignups.length > 0 ? 'warning' : 'default'}
                onClick={() => setOnlyEmpty(v => !v)}
                active={onlyEmpty}
              />
            </StatCardRow>
          ) : undefined
        }
        aside={
          <>
            <WorkList
              title={tx('Nächste Events')}
              icon={<IconCalendarEvent size={16} />}
              items={shownEvents.map(e => {
                const n = countByEvent.get(e.record_id) ?? 0;
                const max = e.fields.max_teilnehmer;
                return {
                  id: e.record_id,
                  title: e.fields.titel ?? '—',
                  secondLine: (
                    <>
                      <span className="font-medium">{max ? `${n}/${max}` : n} {tx('Anmeldungen')}</span>
                      <span className="text-muted-foreground"> · {formatDate(e.fields.datum_uhrzeit)}{e.ortName ? ` · ${e.ortName}` : ''}</span>
                    </>
                  ),
                  action: crud.anmeldungen.canWrite
                    ? { label: tx('+ Anmeldung'), onClick: () => crud.anmeldungen.openCreate({ event: e.record_id }) }
                    : undefined,
                };
              })}
              onItemClick={id => {
                const rec = eventVerwaltung.find(e => e.record_id === id);
                if (rec) crud.eventVerwaltung.openDetail(rec);
              }}
              empty={{ text: tx('Keine kommenden Events.'), action: crud.eventVerwaltung.canWrite ? { label: tx('Event anlegen'), onClick: () => crud.eventVerwaltung.openCreate({}) } : undefined }}
            />
            <WorkList
              title={appLabel('skateparks_spots')}
              icon={<IconMapPin size={16} />}
              items={spotItems.map(({ s, n }) => ({
                id: s.record_id,
                title: s.fields.name ?? '—',
                secondLine: (
                  <span className="text-muted-foreground">
                    {s.fields.stadt ?? ''} · {n} {tx('kommende Events')}
                  </span>
                ),
                action: crud.eventVerwaltung.canWrite
                  ? { label: tx('+ Event'), onClick: () => crud.eventVerwaltung.openCreate({ ort: s.record_id }) }
                  : undefined,
              }))}
              onItemClick={id => {
                const rec = skateparksSpots.find(s => s.record_id === id);
                if (rec) crud.skateparksSpots.openDetail(rec);
              }}
              empty={{ text: tx('Noch keine Orte angelegt.'), action: crud.skateparksSpots.canWrite ? { label: tx('Ort anlegen'), onClick: () => crud.skateparksSpots.openCreate({}) } : undefined }}
            />
          </>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            defaultView="month"
            locale={dateFnsLocale()}
            onEventClick={ev => {
              const rec = eventVerwaltung.find(e => e.record_id === ev.id.split(':')[1]);
              if (rec) crud.eventVerwaltung.openDetail(rec);
            }}
            onEventDrop={(id, newStart) => { reschedule(id, newStart); }}
            onEmptyClick={date => {
              if (crud.eventVerwaltung.canWrite) crud.eventVerwaltung.openCreate({ datum_uhrzeit: format(date, "yyyy-MM-dd'T'HH:mm") });
            }}
          />
        }
      />
      {crud.surfaces}
    </div>
  );
}
