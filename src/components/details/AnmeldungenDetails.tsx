import type { Anmeldungen, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface AnmeldungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Anmeldungen;
  /** N:1-Ziel „EventVerwaltung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  eventVerwaltungList: EventVerwaltung[];
  /** Klick auf die EventVerwaltung-Relation → overlay.push auf dessen Detail. */
  onOpenEventVerwaltung?: (record: EventVerwaltung) => void;
}

export function AnmeldungenDetails({
  record,
  eventVerwaltungList,
  onOpenEventVerwaltung,
}: AnmeldungenDetailsProps) {
  const eventTarget = eventVerwaltungList.find(r => r.record_id === extractRecordId(record.fields.event));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Vorname" value={record.fields.vorname} format="text" />
        <RecordField label="Nachname" value={record.fields.nachname} format="text" />
        <RecordField label="Geburtsdatum" value={record.fields.geburtsdatum} format="date" />
        <RecordField label="E-Mail-Adresse" value={record.fields.email} format="email" />
        <RecordField label="Telefonnummer" value={record.fields.telefon} format="text" />
        <RecordField label="Skill-Level" value={record.fields.skill_level} format="pill" />
        <RecordField label="Board-Stil" value={Array.isArray(record.fields.board_stil) ? record.fields.board_stil.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label="Anmerkungen" value={record.fields.anmerkungen} format="longtext" className="md:col-span-2" />
        <RecordField label="Ich stimme den Teilnahmebedingungen zu" value={record.fields.teilnahmebedingungen} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={1}>
        <RecordRelation
          label="Event"
          name={eventTarget?.fields.titel ?? '—'}
          meta={[eventTarget?.fields.kontakt_email, eventTarget?.fields.kontakt_telefon].filter(Boolean).join(' · ') || undefined}
          onClick={eventTarget && onOpenEventVerwaltung ? () => onOpenEventVerwaltung!(eventTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} />
    </>
  );
}
