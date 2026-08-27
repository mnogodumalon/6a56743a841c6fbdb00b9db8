import type { SkateparksSpots, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MapRouteLinks } from '@/components/widgets/MapWidget';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface SkateparksSpotsDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: SkateparksSpots;
  /** 1:N „Event-Verwaltung" (ort): VOLLE Liste — der Block filtert auf diesen Record. */
  eventVerwaltungList: EventVerwaltung[];
  /** Zeilen-Klick → overlay.push auf das EventVerwaltung-Detail (nie der Edit-Dialog). */
  onOpenEventVerwaltung: (record: EventVerwaltung) => void;
  /** Kontextuelles „+": öffnet den EventVerwaltung-Dialog mit diesem Record vorgesetzt. */
  onAddEventVerwaltung: () => void;
}

export function SkateparksSpotsDetails({
  record,
  eventVerwaltungList,
  onOpenEventVerwaltung,
  onAddEventVerwaltung,
}: SkateparksSpotsDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('skateparks_spots', 'name')} value={record.fields.name} format="text" />
        <RecordField label={fieldLabel('skateparks_spots', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('skateparks_spots', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('skateparks_spots', 'postleitzahl')} value={record.fields.postleitzahl} format="text" />
        <RecordField label={fieldLabel('skateparks_spots', 'stadt')} value={record.fields.stadt} format="text" />
        <RecordField label={fieldLabel('skateparks_spots', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('skateparks_spots', 'untergrundtyp')} value={record.fields.untergrundtyp} format="pill" />
        <RecordField label={fieldLabel('skateparks_spots', 'standort')}>
          {record.fields.standort ? (
            <div className="space-y-1">
              <div>{record.fields.standort.info ?? `${record.fields.standort.lat}, ${record.fields.standort.long}`}</div>
              {/* Directions links — the map popup is hover-fleeting; the overlay
                  is the only mobile-reachable place for navigation. */}
              <MapRouteLinks lat={record.fields.standort.lat} long={record.fields.standort.long} />
            </div>
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('skateparks_spots', 'website')} value={record.fields.website} format="url" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('event_verwaltung')}
        items={eventVerwaltungList.filter(r => extractRecordId(r.fields.ort) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('event_verwaltung'), meta: r.fields.datum_uhrzeit })}
        onOpen={onOpenEventVerwaltung}
        onAdd={onAddEventVerwaltung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SKATEPARKS_SPOTS} recordId={record.record_id} />
    </>
  );
}
