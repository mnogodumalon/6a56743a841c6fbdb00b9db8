import { useState } from 'react';
import type { SkateparksSpots } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconChevronDown } from '@tabler/icons-react';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { MapRouteLinks } from '@/components/widgets/MapWidget';
import { t, appLabel, fieldLabel, lookupLabel } from '@/i18n';

interface SkateparksSpotsViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: SkateparksSpots | null;
  onEdit: (record: SkateparksSpots) => void;
}

export function SkateparksSpotsViewDialog({ open, onClose, record, onEdit }: SkateparksSpotsViewDialogProps) {
  const [showCoords, setShowCoords] = useState(false);

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('skateparks_spots') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'name')}</Label>
            <p className="text-sm">{record.fields.name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'strasse')}</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'hausnummer')}</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'postleitzahl')}</Label>
            <p className="text-sm">{record.fields.postleitzahl ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'stadt')}</Label>
            <p className="text-sm">{record.fields.stadt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'untergrundtyp')}</Label>
            <Badge variant="secondary">{lookupLabel('skateparks_spots', 'untergrundtyp', record.fields.untergrundtyp?.key) ?? record.fields.untergrundtyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'standort')}</Label>
            {record.fields.standort?.info && (
              <p className="text-sm text-muted-foreground break-words whitespace-normal">{record.fields.standort.info}</p>
            )}
            {record.fields.standort?.lat != null && record.fields.standort?.long != null && (
              <GeoMapPicker
                lat={record.fields.standort.lat}
                lng={record.fields.standort.long}
                readOnly
              />
            )}
            {record.fields.standort?.lat != null && record.fields.standort?.long != null && (
              <MapRouteLinks lat={record.fields.standort.lat} long={record.fields.standort.long} className="mt-1" />
            )}
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1 max-sm:py-2 transition-colors" onClick={() => setShowCoords(v => !v)}>
              {showCoords ? t('fr_hide_coords') : t('fr_show_coords')}
              <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
            </button>
            {showCoords && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-xs text-muted-foreground">{t('fr_lat')}:</span> {record.fields.standort?.lat?.toFixed(6) ?? '—'}</div>
                <div><span className="text-xs text-muted-foreground">{t('fr_long')}:</span> {record.fields.standort?.long?.toFixed(6) ?? '—'}</div>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('skateparks_spots', 'website')}</Label>
            <p className="text-sm">{record.fields.website ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.SKATEPARKS_SPOTS} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}