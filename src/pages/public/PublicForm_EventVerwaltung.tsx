import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a56741f84d8dce105858830';
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

export default function PublicFormEventVerwaltung() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

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
          <h1 className="text-2xl font-bold text-foreground">Event-Verwaltung — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="titel">Titel des Events *</Label>
            <Input
              id="titel"
              placeholder=""
              value={fields.titel ?? ''}
              onChange={e => setFields(f => ({ ...f, titel: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'jam'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'jam' ? undefined : 'jam') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'jam'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Jam Session
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'demo'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'demo' ? undefined : 'demo') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'demo'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Demo
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'workshop'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'workshop' ? undefined : 'workshop') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'workshop'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Workshop
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'sonstiges'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'sonstiges' ? undefined : 'sonstiges') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'sonstiges'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.kategorie) === 'contest'}
                onClick={() => setFields(f => ({ ...f, kategorie: (lookupKey(f.kategorie) === 'contest' ? undefined : 'contest') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.kategorie) === 'contest'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Contest
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="datum_uhrzeit">Datum und Uhrzeit *</Label>
            <DatePicker
              id="datum_uhrzeit"
              placeholder=""
              mode="datetime"
              value={fields.datum_uhrzeit ?? null}
              onChange={v => setFields(f => ({ ...f, datum_uhrzeit: v ?? undefined }))}
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
            <Label htmlFor="skill_level">Skill-Level</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.skill_level) === 'anfaenger'}
                onClick={() => setFields(f => ({ ...f, skill_level: (lookupKey(f.skill_level) === 'anfaenger' ? undefined : 'anfaenger') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.skill_level) === 'anfaenger'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Anfänger
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.skill_level) === 'fortgeschritten'}
                onClick={() => setFields(f => ({ ...f, skill_level: (lookupKey(f.skill_level) === 'fortgeschritten' ? undefined : 'fortgeschritten') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.skill_level) === 'fortgeschritten'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Fortgeschritten
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.skill_level) === 'profi'}
                onClick={() => setFields(f => ({ ...f, skill_level: (lookupKey(f.skill_level) === 'profi' ? undefined : 'profi') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.skill_level) === 'profi'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Profi
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.skill_level) === 'alle_levels'}
                onClick={() => setFields(f => ({ ...f, skill_level: (lookupKey(f.skill_level) === 'alle_levels' ? undefined : 'alle_levels') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.skill_level) === 'alle_levels'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Alle Levels
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_teilnehmer">Maximale Teilnehmerzahl</Label>
            <Input
              id="max_teilnehmer"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.max_teilnehmer ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, max_teilnehmer: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startgebuehr">Startgebühr (€)</Label>
            <Input
              id="startgebuehr"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.startgebuehr ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, startgebuehr: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kontakt_email">Kontakt-E-Mail</Label>
            <Input
              id="kontakt_email"
              type="email"
              placeholder=""
              value={fields.kontakt_email ?? ''}
              onChange={e => setFields(f => ({ ...f, kontakt_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_website">Website des Events</Label>
            <Input
              id="event_website"
              value={fields.event_website ?? ''}
              onChange={e => setFields(f => ({ ...f, event_website: e.target.value }))}
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
