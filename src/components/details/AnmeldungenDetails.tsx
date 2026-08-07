import type { Anmeldungen, EventVerwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

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
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('anmeldungen', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'geburtsdatum')} value={record.fields.geburtsdatum} format="date" />
        <RecordField label={fieldLabel('anmeldungen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('anmeldungen', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'skill_level')} value={record.fields.skill_level} format="pill" />
        <RecordField label={fieldLabel('anmeldungen', 'board_stil')} value={Array.isArray(record.fields.board_stil) ? record.fields.board_stil.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'anmerkungen')} value={record.fields.anmerkungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('anmeldungen', 'teilnahmebedingungen')} value={record.fields.teilnahmebedingungen} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('anmeldungen', 'event')}
          name={eventTarget?.fields.titel ?? '—'}
          meta={[eventTarget?.fields.kontakt_email, eventTarget?.fields.kontakt_telefon].filter(Boolean).join(' · ') || undefined}
          onClick={eventTarget && onOpenEventVerwaltung ? () => onOpenEventVerwaltung!(eventTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} />
    </>
  );
}
