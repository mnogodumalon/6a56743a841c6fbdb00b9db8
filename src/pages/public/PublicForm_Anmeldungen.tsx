import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a5674227925510842ea49d7';
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

export default function PublicFormAnmeldungen() {
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
          <h1 className="text-2xl font-bold text-foreground">Anmeldungen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname *</Label>
            <Input
              id="vorname"
              placeholder=""
              value={fields.vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname *</Label>
            <Input
              id="nachname"
              placeholder=""
              value={fields.nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
            <DatePicker
              id="geburtsdatum"
              placeholder=""
              mode="date"
              value={fields.geburtsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, geburtsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse *</Label>
            <Input
              id="email"
              type="email"
              placeholder=""
              value={fields.email ?? ''}
              onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefonnummer</Label>
            <Input
              id="telefon"
              value={fields.telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill_level">Skill-Level *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
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
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board_stil">Board-Stil</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="board_stil_street"
                  checked={lookupKeys(fields.board_stil).includes('street')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.board_stil);
                      const next = checked ? [...current, 'street'] : current.filter(k => k !== 'street');
                      return { ...f, board_stil: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="board_stil_street" className="font-normal">Street</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="board_stil_park"
                  checked={lookupKeys(fields.board_stil).includes('park')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.board_stil);
                      const next = checked ? [...current, 'park'] : current.filter(k => k !== 'park');
                      return { ...f, board_stil: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="board_stil_park" className="font-normal">Park</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="board_stil_vert"
                  checked={lookupKeys(fields.board_stil).includes('vert')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.board_stil);
                      const next = checked ? [...current, 'vert'] : current.filter(k => k !== 'vert');
                      return { ...f, board_stil: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="board_stil_vert" className="font-normal">Vert</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="board_stil_bowl"
                  checked={lookupKeys(fields.board_stil).includes('bowl')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.board_stil);
                      const next = checked ? [...current, 'bowl'] : current.filter(k => k !== 'bowl');
                      return { ...f, board_stil: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="board_stil_bowl" className="font-normal">Bowl</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="board_stil_freestyle"
                  checked={lookupKeys(fields.board_stil).includes('freestyle')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.board_stil);
                      const next = checked ? [...current, 'freestyle'] : current.filter(k => k !== 'freestyle');
                      return { ...f, board_stil: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="board_stil_freestyle" className="font-normal">Freestyle</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anmerkungen">Anmerkungen</Label>
            <Textarea
              id="anmerkungen"
              placeholder=""
              value={fields.anmerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, anmerkungen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teilnahmebedingungen">Ich stimme den Teilnahmebedingungen zu *</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="teilnahmebedingungen"
                checked={!!fields.teilnahmebedingungen}
                onCheckedChange={(v) => setFields(f => ({ ...f, teilnahmebedingungen: !!v }))}
              />
              <Label htmlFor="teilnahmebedingungen" className="font-normal">Ich stimme den Teilnahmebedingungen zu</Label>
            </div>
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
