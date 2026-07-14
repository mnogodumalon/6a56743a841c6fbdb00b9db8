import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconChevronDown, IconCrosshair, IconLoader2 } from '@tabler/icons-react';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { ensureUploadableImage } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a56741a9ef9a79ac692ad70';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormSkateparksSpots() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);
  const [locating, setLocating] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [geoFromPhoto, setGeoFromPhoto] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name ?? '';
    } catch { return ''; }
  }

  async function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const info = await reverseGeocode(latitude, longitude);
      setFields(f => ({ ...f, [fieldKey]: { lat: latitude, long: longitude, info } as any }));
      setGeoFromPhoto(false);
      setLocating(false);
    }, () => { setLocating(false); });
  }

  function handleMapMove(fieldKey: string, lat: number, lng: number) {
    setFields(f => ({ ...f, [fieldKey]: { ...((f as any)[fieldKey] ?? {}), lat, long: lng } }));
    clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(async () => {
      const info = await reverseGeocode(lat, lng);
      setFields(f => ({ ...f, [fieldKey]: { ...((f as any)[fieldKey] ?? {}), info } }));
    }, 600);
  }

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Skateparks & Spots — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="name">Name des Ortes *</Label>
            <Input
              id="name"
              placeholder=""
              value={fields.name ?? ''}
              onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strasse">Straße *</Label>
            <Input
              id="strasse"
              placeholder=""
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hausnummer">Hausnummer *</Label>
            <Input
              id="hausnummer"
              placeholder=""
              value={fields.hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postleitzahl">Postleitzahl *</Label>
            <Input
              id="postleitzahl"
              placeholder=""
              value={fields.postleitzahl ?? ''}
              onChange={e => setFields(f => ({ ...f, postleitzahl: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stadt">Stadt *</Label>
            <Input
              id="stadt"
              placeholder=""
              value={fields.stadt ?? ''}
              onChange={e => setFields(f => ({ ...f, stadt: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              placeholder=""
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="untergrundtyp">Untergrundtyp</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.untergrundtyp) === 'beton'}
                onClick={() => setFields(f => ({ ...f, untergrundtyp: (lookupKey(f.untergrundtyp) === 'beton' ? undefined : 'beton') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.untergrundtyp) === 'beton'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Beton
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.untergrundtyp) === 'asphalt'}
                onClick={() => setFields(f => ({ ...f, untergrundtyp: (lookupKey(f.untergrundtyp) === 'asphalt' ? undefined : 'asphalt') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.untergrundtyp) === 'asphalt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Asphalt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.untergrundtyp) === 'holz'}
                onClick={() => setFields(f => ({ ...f, untergrundtyp: (lookupKey(f.untergrundtyp) === 'holz' ? undefined : 'holz') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.untergrundtyp) === 'holz'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Holz
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.untergrundtyp) === 'fliesen'}
                onClick={() => setFields(f => ({ ...f, untergrundtyp: (lookupKey(f.untergrundtyp) === 'fliesen' ? undefined : 'fliesen') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.untergrundtyp) === 'fliesen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Fliesen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.untergrundtyp) === 'sonstiges'}
                onClick={() => setFields(f => ({ ...f, untergrundtyp: (lookupKey(f.untergrundtyp) === 'sonstiges' ? undefined : 'sonstiges') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.untergrundtyp) === 'sonstiges'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="standort">Standort auf der Karte</Label>
            <div className="space-y-3">
              <Button type="button" variant="outline" className="w-full max-sm:h-11" disabled={locating} onClick={() => geoLocate("standort")}>
                {locating ? <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <IconCrosshair className="h-4 w-4 mr-1.5" />}
                Aktuellen Standort verwenden
              </Button>
              <AddressAutocomplete
                placeholder="Adresse suchen und auswählen…"
                onSelect={r => setFields(f => ({ ...f, standort: { lat: r.lat, long: r.long, info: r.label } as any }))}
              />
              {geoFromPhoto && fields.standort && (
                <p className="text-xs text-primary italic">Standort aus Foto übernommen</p>
              )}
              {fields.standort?.info && (
                <p className="text-sm text-muted-foreground break-words whitespace-normal">
                  {fields.standort.info}
                </p>
              )}
              {fields.standort?.lat != null && fields.standort?.long != null && (
                <GeoMapPicker
                  lat={fields.standort.lat}
                  lng={fields.standort.long}
                  onChange={(lat, lng) => handleMapMove("standort", lat, lng)}
                />
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1 max-sm:py-2 transition-colors" onClick={() => setShowCoords(v => !v)}>
                {showCoords ? 'Koordinaten verbergen' : 'Koordinaten anzeigen'}
                <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
              </button>
              {showCoords && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Breitengrad</Label>
                    <Input type="number" step="any"
                      value={fields.standort?.lat ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, standort: { ...(f.standort as any ?? {}), lat: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Längengrad</Label>
                    <Input type="number" step="any"
                      value={fields.standort?.long ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, standort: { ...(f.standort as any ?? {}), long: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={fields.website ?? ''}
              onChange={e => setFields(f => ({ ...f, website: e.target.value }))}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
