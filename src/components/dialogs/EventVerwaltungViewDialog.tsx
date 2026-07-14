import type { EventVerwaltung, SkateparksSpots } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface EventVerwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: EventVerwaltung | null;
  onEdit: (record: EventVerwaltung) => void;
  skateparksSpotsList: SkateparksSpots[];
}

export function EventVerwaltungViewDialog({ open, onClose, record, onEdit, skateparksSpotsList }: EventVerwaltungViewDialogProps) {
  function getSkateparksSpotsDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return skateparksSpotsList.find(r => r.record_id === id)?.fields.name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event-Verwaltung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel des Events</Label>
            <p className="text-sm">{record.fields.titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <Badge variant="secondary">{record.fields.kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum und Uhrzeit</Label>
            <p className="text-sm">{formatDate(record.fields.datum_uhrzeit)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Skill-Level</Label>
            <Badge variant="secondary">{record.fields.skill_level?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Maximale Teilnehmerzahl</Label>
            <p className="text-sm">{record.fields.max_teilnehmer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Startgebühr (€)</Label>
            <p className="text-sm">{record.fields.startgebuehr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ort</Label>
            <p className="text-sm">{getSkateparksSpotsDisplayName(record.fields.ort)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kontakt-E-Mail</Label>
            <p className="text-sm">{record.fields.kontakt_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Website des Events</Label>
            <p className="text-sm">{record.fields.event_website ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Flyer / Bild</Label>
            {record.fields.flyer ? (
              <MediaThumbnail src={record.fields.flyer} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.EVENT_VERWALTUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}