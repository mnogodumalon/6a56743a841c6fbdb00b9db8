import type { EventVerwaltung, SkateparksSpots, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface EventVerwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: EventVerwaltung;
  /** N:1-Ziel „SkateparksSpots": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  skateparksSpotsList: SkateparksSpots[];
  /** Klick auf die SkateparksSpots-Relation → overlay.push auf dessen Detail. */
  onOpenSkateparksSpots?: (record: SkateparksSpots) => void;
  /** 1:N „Anmeldungen": VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen: () => void;
}

export function EventVerwaltungDetails({
  record,
  skateparksSpotsList,
  onOpenSkateparksSpots,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: EventVerwaltungDetailsProps) {
  const ortTarget = skateparksSpotsList.find(r => r.record_id === extractRecordId(record.fields.ort));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Titel des Events" value={record.fields.titel} format="text" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Datum und Uhrzeit" value={record.fields.datum_uhrzeit} format="datetime" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Skill-Level" value={record.fields.skill_level} format="pill" />
        <RecordField label="Maximale Teilnehmerzahl" value={record.fields.max_teilnehmer} format="text" />
        <RecordField label="Startgebühr (€)" value={record.fields.startgebuehr} format="text" />
        <RecordField label="Kontakt-E-Mail" value={record.fields.kontakt_email} format="email" />
        <RecordField label="Website des Events" value={record.fields.event_website} format="url" />
        <RecordField label="Flyer / Bild" className="md:col-span-2">
          {record.fields.flyer ? (
            <MediaThumbnail src={record.fields.flyer as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label="Kontakt-Telefonnummer" value={record.fields.kontakt_telefon} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={1}>
        <RecordRelation
          label="Ort"
          name={ortTarget?.fields.name ?? '—'}
          meta={[ortTarget?.fields.strasse, ortTarget?.fields.hausnummer].filter(Boolean).join(' · ') || undefined}
          onClick={ortTarget && onOpenSkateparksSpots ? () => onOpenSkateparksSpots!(ortTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title="Anmeldungen"
        items={anmeldungenList.filter(r => extractRecordId(r.fields.event) === record.record_id)}
        map={r => ({ name: r.fields.vorname ?? 'Anmeldungen', meta: r.fields.geburtsdatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} />
    </>
  );
}
