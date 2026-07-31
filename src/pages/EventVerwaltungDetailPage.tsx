import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { EventVerwaltung, SkateparksSpots } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { EventVerwaltungDialog } from '@/components/dialogs/EventVerwaltungDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/EventVerwaltung';
import { evalComputed } from '@/config/form-enhancements/types';

export default function EventVerwaltungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<EventVerwaltung | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [skateparksSpotsList, setSkateparksSpotsList] = useState<SkateparksSpots[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, skateparksSpotsData] = await Promise.all([
        LivingAppsService.getEventVerwaltung(),
        LivingAppsService.getSkateparksSpots(),
      ]);
      setSkateparksSpotsList(skateparksSpotsData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: EventVerwaltung['fields']) {
    if (!record) return;
    await LivingAppsService.updateEventVerwaltungEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteEventVerwaltungEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/event-verwaltung');
  }

  function getSkateparksSpotsDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return skateparksSpotsList.find(r => r.record_id === refId)?.fields.name ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/event-verwaltung')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/event-verwaltung')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.titel ?? 'Event-Verwaltung'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          ort: skateparksSpotsList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Titel des Events" value={record.fields.titel} format="text" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Datum und Uhrzeit" value={record.fields.datum_uhrzeit} format="datetime" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Skill-Level" value={record.fields.skill_level} format="pill" />
        <RecordField label="Maximale Teilnehmerzahl" value={record.fields.max_teilnehmer} format="text" />
        <RecordField label="Startgebühr (€)" value={record.fields.startgebuehr} format="text" />
        <RecordField label="Ort" value={getSkateparksSpotsDisplayName(record.fields.ort)} format="text" />
        <RecordField label="Kontakt-E-Mail" value={record.fields.kontakt_email} format="email" />
        <RecordField label="Website des Events" value={record.fields.event_website} format="url" />
        <RecordField label="Kontakt-Telefonnummer" value={record.fields.kontakt_telefon} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <EventVerwaltungDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        skateparksSpotsList={skateparksSpotsList}
        enablePhotoScan={AI_PHOTO_SCAN['EventVerwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EventVerwaltung']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Event-Verwaltung löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
