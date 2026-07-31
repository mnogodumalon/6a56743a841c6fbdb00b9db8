/**
 * Teilnehmer anmelden — 3-Schritt-Wizard.
 * Steps: 1) Event auswählen → 2) Anmeldedaten eingeben → 3) Bestätigung.
 * Reads: eventVerwaltung, anmeldungen.
 * Writes: anmeldungen (createAnmeldungenEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  IconCalendarEvent,
  IconUser,
  IconMail,
  IconPhone,
  IconAlertTriangle,
  IconCircleCheck,
  IconBolt,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { EventVerwaltung } from '@/types/app';
import { formatDateTime } from '@/lib/formatters';

const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['anmeldungen']?.['skill_level'] ?? [];
const BOARD_STIL_OPTIONS = LOOKUP_OPTIONS['anmeldungen']?.['board_stil'] ?? [];

export default function TeilnehmerAnmeldenPage() {
  const { eventVerwaltung, anmeldungen, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);

  // Step 1 — selected event
  const [selectedEvent, setSelectedEvent] = useState<EventVerwaltung | null>(null);

  // Step 2 — form fields
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [geburtsdatum, setGeburtsdatum] = useState('');
  const [telefon, setTelefon] = useState('');
  const [boardStil, setBoardStil] = useState<string[]>([]);
  const [anmerkungen, setAnmerkungen] = useState('');
  const [teilnahmebedingungen, setTeilnahmebedingungen] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdAnmeldungId, setCreatedAnmeldungId] = useState<string | null>(null);

  // Compute per-event anmeldungen counts
  const anmeldungenCountByEvent = useMemo(() => {
    const counts = new Map<string, number>();
    anmeldungen.forEach(a => {
      const url = a.fields.event;
      if (!url) return;
      const match = url.match(/([a-f0-9]{24})$/i);
      if (!match) return;
      const id = match[1];
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  }, [anmeldungen]);

  // Selected event's registration count
  const selectedEventCount = selectedEvent
    ? (anmeldungenCountByEvent.get(selectedEvent.record_id) ?? 0)
    : 0;
  const selectedEventMax = selectedEvent?.fields.max_teilnehmer ?? null;

  function formatEventDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de });
    } catch {
      return dateStr;
    }
  }

  function handleSelectEvent(id: string) {
    const ev = eventVerwaltung.find(e => e.record_id === id) ?? null;
    setSelectedEvent(ev);
    setStep(2);
  }

  function resetWizard() {
    setStep(1);
    setSelectedEvent(null);
    setVorname('');
    setNachname('');
    setEmail('');
    setSkillLevel('');
    setGeburtsdatum('');
    setTelefon('');
    setBoardStil([]);
    setAnmerkungen('');
    setTeilnahmebedingungen(false);
    setSubmitError(null);
    setCreatedAnmeldungId(null);
  }

  function toggleBoardStil(key: string) {
    setBoardStil(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function handleSubmit() {
    if (!selectedEvent) return;

    // Idempotency guard — if already created, don't duplicate
    if (createdAnmeldungId) {
      setStep(3);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createAnmeldungenEntry({
        vorname,
        nachname,
        email,
        skill_level: skillLevel || undefined,
        geburtsdatum: geburtsdatum || undefined,
        telefon: telefon || undefined,
        board_stil: boardStil.length > 0 ? boardStil : undefined,
        anmerkungen: anmerkungen || undefined,
        teilnahmebedingungen: true,
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEvent.record_id),
      });
      setCreatedAnmeldungId(result.record_id);
      await fetchAll();
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    vorname.trim() !== '' &&
    nachname.trim() !== '' &&
    email.trim() !== '' &&
    skillLevel !== '' &&
    teilnahmebedingungen;

  return (
    <IntentWizardShell
      title="Skater anmelden"
      subtitle="Melde einen Teilnehmer in drei Schritten für ein Event an."
      steps={[
        { label: 'Event wählen' },
        { label: 'Anmeldedaten' },
        { label: 'Bestätigung' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* SCHRITT 1 — Event auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Event auswählen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Wähle das Event, für das du einen Skater anmelden möchtest.
            </p>
          </div>
          <EntitySelectStep
            searchPlaceholder="Event suchen..."
            emptyIcon={<IconCalendarEvent size={32} />}
            emptyText="Keine Events gefunden."
            items={eventVerwaltung.map(ev => {
              const count = anmeldungenCountByEvent.get(ev.record_id) ?? 0;
              const max = ev.fields.max_teilnehmer;
              const isFullyBooked = max != null && count >= max;
              const spotsText = max != null
                ? `${max - count} / ${max} Plätze frei`
                : `${count} Anmeldungen`;

              return {
                id: ev.record_id,
                title: ev.fields.titel ?? '(Kein Titel)',
                subtitle: formatEventDate(ev.fields.datum_uhrzeit),
                status: isFullyBooked
                  ? { key: 'ausgebucht', label: 'Ausgebucht' }
                  : ev.fields.kategorie
                  ? { key: ev.fields.kategorie.key, label: ev.fields.kategorie.label }
                  : undefined,
                stats: [
                  { label: 'Plätze', value: spotsText },
                  ...(ev.fields.skill_level ? [{ label: 'Level', value: ev.fields.skill_level.label }] : []),
                  ...(ev.fields.startgebuehr != null ? [{ label: 'Gebühr', value: `${ev.fields.startgebuehr} €` }] : []),
                ],
                icon: <IconCalendarEvent size={20} className={isFullyBooked ? 'text-destructive' : 'text-primary'} />,
              };
            })}
            onSelect={handleSelectEvent}
          />
        </div>
      )}

      {/* SCHRITT 2 — Anmeldedaten */}
      {step === 2 && (
        selectedEvent ? (
          <div className="space-y-5">
            {/* Event-Banner */}
            <div className="rounded-2xl border bg-card p-4 flex items-start gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconCalendarEvent size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{selectedEvent.fields.titel ?? '(Kein Titel)'}</p>
                <p className="text-xs text-muted-foreground">{formatEventDate(selectedEvent.fields.datum_uhrzeit)}</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="ml-auto shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Ändern
              </button>
            </div>

            {/* Belegungsanzeige */}
            {selectedEventMax != null && (
              <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 text-sm ${
                selectedEventCount >= selectedEventMax
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : 'bg-secondary text-foreground'
              }`}>
                {selectedEventCount >= selectedEventMax
                  ? <IconAlertTriangle size={16} className="shrink-0" />
                  : <IconBolt size={16} className="shrink-0 text-primary" />
                }
                <span>
                  <strong>{selectedEventCount}</strong> von <strong>{selectedEventMax}</strong> Plätzen belegt
                  {selectedEventCount >= selectedEventMax && ' — Event ist ausgebucht'}
                </span>
              </div>
            )}

            {/* Formular */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Anmeldedaten eingeben</h2>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vorname">Vorname <span className="text-destructive">*</span></Label>
                  <Input
                    id="vorname"
                    value={vorname}
                    onChange={e => setVorname(e.target.value)}
                    placeholder="z. B. Max"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nachname">Nachname <span className="text-destructive">*</span></Label>
                  <Input
                    id="nachname"
                    value={nachname}
                    onChange={e => setNachname(e.target.value)}
                    placeholder="z. B. Mustermann"
                  />
                </div>
              </div>

              {/* Kontakt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-Mail <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <IconMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="max@beispiel.de"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefon">Telefon</Label>
                  <div className="relative">
                    <IconPhone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="telefon"
                      type="tel"
                      value={telefon}
                      onChange={e => setTelefon(e.target.value)}
                      placeholder="+49 ..."
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Skill Level + Geburtsdatum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="skill-level">Skill Level <span className="text-destructive">*</span></Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger id="skill-level">
                      <SelectValue placeholder="Level wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_LEVEL_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
                  <Input
                    id="geburtsdatum"
                    type="date"
                    value={geburtsdatum}
                    onChange={e => setGeburtsdatum(e.target.value)}
                  />
                </div>
              </div>

              {/* Board-Stil */}
              <div className="space-y-2">
                <Label>Board-Stil</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BOARD_STIL_OPTIONS.map(opt => {
                    const checked = boardStil.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleBoardStil(opt.key)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                          checked
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-card border-border text-foreground'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                        }`}>
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anmerkungen */}
              <div className="space-y-1.5">
                <Label htmlFor="anmerkungen">Anmerkungen</Label>
                <Textarea
                  id="anmerkungen"
                  value={anmerkungen}
                  onChange={e => setAnmerkungen(e.target.value)}
                  placeholder="Besondere Hinweise, Fragen, ..."
                  rows={3}
                />
              </div>

              {/* Teilnahmebedingungen */}
              <div className="rounded-xl border bg-secondary/50 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="teilnahmebedingungen"
                    checked={teilnahmebedingungen}
                    onCheckedChange={v => setTeilnahmebedingungen(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="teilnahmebedingungen" className="text-sm leading-relaxed cursor-pointer">
                    Ich stimme den Teilnahmebedingungen zu und bestätige, dass die angemeldete Person an der Veranstaltung teilnehmen darf. <span className="text-destructive">*</span>
                  </Label>
                </div>
              </div>

              {/* Fehler */}
              {submitError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2 text-sm text-destructive">
                  <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Aktionen */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="sm:w-auto w-full"
                >
                  Zurück
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="sm:flex-1 w-full"
                >
                  {submitting ? 'Wird angemeldet...' : 'Jetzt anmelden'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">Dieser Schritt braucht die Auswahl aus Schritt 1.</p>
            <Button variant="outline" onClick={() => setStep(1)}>Neu starten</Button>
          </div>
        )
      )}

      {/* SCHRITT 3 — Bestätigung */}
      {step === 3 && (
        selectedEvent && createdAnmeldungId ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <IconCircleCheck size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Anmeldung erfolgreich!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {vorname} {nachname} wurde erfolgreich angemeldet.
                </p>
              </div>
            </div>

            {/* Zusammenfassung */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-secondary/30">
                <p className="text-sm font-semibold">Anmeldungsdetails</p>
              </div>
              <div className="divide-y">
                <div className="flex items-center gap-3 px-4 py-3">
                  <IconUser size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Teilnehmer</span>
                  <span className="ml-auto text-sm font-medium">{vorname} {nachname}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <IconMail size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">E-Mail</span>
                  <span className="ml-auto text-sm font-medium truncate max-w-[200px]">{email}</span>
                </div>
                {skillLevel && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <IconBolt size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Skill Level</span>
                    <span className="ml-auto text-sm font-medium">
                      {SKILL_LEVEL_OPTIONS.find(o => o.key === skillLevel)?.label ?? skillLevel}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-3 px-4 py-3">
                  <IconCalendarEvent size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">Event</span>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-medium">{selectedEvent.fields.titel ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{formatEventDate(selectedEvent.fields.datum_uhrzeit)}</p>
                  </div>
                </div>
                {boardStil.length > 0 && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <IconBolt size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Board-Stil</span>
                    <span className="ml-auto text-sm font-medium text-right max-w-[200px]">
                      {boardStil.map(k => BOARD_STIL_OPTIONS.find(o => o.key === k)?.label ?? k).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={resetWizard}
                className="w-full sm:flex-1"
              >
                Weitere Anmeldung
              </Button>
              <a href="#/" className="w-full sm:flex-1">
                <Button className="w-full">
                  Zurück zum Dashboard
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">Dieser Schritt braucht eine abgeschlossene Anmeldung.</p>
            <Button variant="outline" onClick={() => setStep(selectedEvent ? 2 : 1)}>Zurück</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
