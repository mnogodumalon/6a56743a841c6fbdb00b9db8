import type { SkateparksSpots, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface SkateparksSpotsDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: SkateparksSpots;
  /** 1:N „Event-Verwaltung": VOLLE Liste — der Block filtert auf diesen Record. */
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
      <RecordSection title="Details" cols={2}>
        <RecordField label="Name des Ortes" value={record.fields.name} format="text" />
        <RecordField label="Straße" value={record.fields.strasse} format="text" />
        <RecordField label="Hausnummer" value={record.fields.hausnummer} format="text" />
        <RecordField label="Postleitzahl" value={record.fields.postleitzahl} format="text" />
        <RecordField label="Stadt" value={record.fields.stadt} format="text" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Untergrundtyp" value={record.fields.untergrundtyp} format="pill" />
        <RecordField label="Standort auf der Karte" value={record.fields.standort?.info ?? (record.fields.standort ? `${record.fields.standort.lat}, ${record.fields.standort.long}` : null)} />
        <RecordField label="Website" value={record.fields.website} format="url" />
      </RecordSection>

      <SatelliteSection
        title="Event-Verwaltung"
        items={eventVerwaltungList.filter(r => extractRecordId(r.fields.ort) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? 'Event-Verwaltung', meta: r.fields.datum_uhrzeit })}
        onOpen={onOpenEventVerwaltung}
        onAdd={onAddEventVerwaltung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SKATEPARKS_SPOTS} recordId={record.record_id} />
    </>
  );
}
