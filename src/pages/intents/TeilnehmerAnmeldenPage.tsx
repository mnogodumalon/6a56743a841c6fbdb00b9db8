import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  IconCalendarEvent,
  IconUser,
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
  IconUsersGroup,
  IconMapPin,
} from '@tabler/icons-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import type { EventVerwaltung } from '@/types/app';

interface FormData {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  email: string;
  telefon: string;
  skill_level: string;
  board_stil: string[];
  anmerkungen: string;
  teilnahmebedingungen: boolean;
}

const EMPTY_FORM: FormData = {
  vorname: '',
  nachname: '',
  geburtsdatum: '',
  email: '',
  telefon: '',
  skill_level: '',
  board_stil: [],
  anmerkungen: '',
  teilnahmebedingungen: false,
};

function formatDatetime(val: string | undefined): string {
  if (!val) return '—';
  try {
    return format(parseISO(val), 'dd. MMM yyyy, HH:mm', { locale: de });
  } catch {
    return val;
  }
}

export default function TeilnehmerAnmeldenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { eventVerwaltung, skateparksSpots, anmeldungen, loading, error, fetchAll, skateparksSpotsMap } =
    useDashboardData();

  const initialStep = Math.max(1, Math.min(3, parseInt(searchParams.get('step') ?? '1', 10)));
  const initialEventId = searchParams.get('eventId') ?? '';

  const [step, setStep] = useState<number>(initialEventId ? 2 : initialStep);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [eventAnmeldungenCount, setEventAnmeldungenCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(step));
    if (selectedEventId) {
      params.set('eventId', selectedEventId);
    } else {
      params.delete('eventId');
    }
    setSearchParams(params, { replace: true });
  }, [step, selectedEventId, searchParams, setSearchParams]);

  // Count registrations for the selected event
  const countAnmeldungenForEvent = useCallback(
    (eventId: string) => {
      const count = anmeldungen.filter((a) => {
        const id = extractRecordId(a.fields.event ?? '');
        return id === eventId;
      }).length;
      setEventAnmeldungenCount(count);
    },
    [anmeldungen]
  );

  useEffect(() => {
    if (selectedEventId) {
      countAnmeldungenForEvent(selectedEventId);
    }
  }, [selectedEventId, countAnmeldungenForEvent]);

  const selectedEvent: EventVerwaltung | undefined = eventVerwaltung.find(
    (e) => e.record_id === selectedEventId
  );

  const ortName = selectedEvent?.fields.ort
    ? (() => {
        const ortId = extractRecordId(selectedEvent.fields.ort);
        if (!ortId) return undefined;
        return skateparksSpotsMap.get(ortId)?.fields.name;
      })()
    : undefined;

  function handleEventSelect(id: string) {
    setSelectedEventId(id);
    setStep(2);
  }

  function handleFormChange<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleBoardStil(key: string) {
    setForm((prev) => {
      const current = prev.board_stil;
      return {
        ...prev,
        board_stil: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
      };
    });
  }

  function isStep2Valid(): boolean {
    return (
      form.vorname.trim() !== '' &&
      form.nachname.trim() !== '' &&
      form.email.trim() !== '' &&
      form.teilnahmebedingungen
    );
  }

  async function handleSubmit() {
    if (!selectedEventId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createAnmeldungenEntry({
        event: createRecordUrl(APP_IDS.EVENT_VERWALTUNG, selectedEventId),
        vorname: form.vorname.trim(),
        nachname: form.nachname.trim(),
        geburtsdatum: form.geburtsdatum || undefined,
        email: form.email.trim(),
        telefon: form.telefon.trim() || undefined,
        skill_level: form.skill_level || undefined,
        board_stil: form.board_stil.length > 0 ? form.board_stil : undefined,
        anmerkungen: form.anmerkungen.trim() || undefined,
        teilnahmebedingungen: form.teilnahmebedingungen,
      });
      await fetchAll();
      setSuccess(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unbekannter Fehler beim Speichern.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnotherPerson() {
    setForm(EMPTY_FORM);
    setSuccess(false);
    setSubmitError(null);
    setStep(2);
  }

  function handleOtherEvent() {
    setSelectedEventId('');
    setForm(EMPTY_FORM);
    setSuccess(false);
    setSubmitError(null);
    setStep(1);
  }

  const skillLevelOptions = LOOKUP_OPTIONS['anmeldungen']['skill_level'] ?? [];
  const boardStilOptions = LOOKUP_OPTIONS['anmeldungen']['board_stil'] ?? [];

  const selectedSkillLabel =
    skillLevelOptions.find((o) => o.key === form.skill_level)?.label ?? '—';

  const selectedBoardStilLabels =
    boardStilOptions
      .filter((o) => form.board_stil.includes(o.key))
      .map((o) => o.label)
      .join(', ') || '—';

  // Event info card (shown in step 2)
  const EventInfoCard = () => {
    if (!selectedEvent) return null;
    return (
      <div className="rounded-xl border bg-secondary/40 p-4 flex items-start gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <IconCalendarEvent size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{selectedEvent.fields.titel ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDatetime(selectedEvent.fields.datum_uhrzeit)}
            {ortName && (
              <span className="ml-2 inline-flex items-center gap-0.5">
                <IconMapPin size={11} className="shrink-0" />
                {ortName}
              </span>
            )}
          </p>
          {selectedEvent.fields.max_teilnehmer != null && (
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              <IconUsersGroup size={12} className="shrink-0" />
              {eventAnmeldungenCount !== null
                ? `${eventAnmeldungenCount} von ${selectedEvent.fields.max_teilnehmer} Plätzen belegt`
                : `${selectedEvent.fields.max_teilnehmer} Plätze max.`}
            </p>
          )}
        </div>
        <button
          onClick={() => setStep(1)}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0 underline underline-offset-2"
        >
          Ändern
        </button>
      </div>
    );
  };

  return (
    <IntentWizardShell
      title="Teilnehmer anmelden"
      subtitle="Event auswählen, Daten erfassen und Anmeldung abschicken"
      steps={[
        { label: 'Event wählen' },
        { label: 'Teilnehmerdaten' },
        { label: 'Bestätigen' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Event auswählen ── */}
      {step === 1 && (
        <div className="space-y-4">
          <EntitySelectStep
            items={eventVerwaltung.map((e) => {
              const ortId = extractRecordId(e.fields.ort ?? '');
              const spot = ortId ? skateparksSpotsMap.get(ortId) : undefined;
              const anmeldungenCount = anmeldungen.filter((a) => {
                const id = extractRecordId(a.fields.event ?? '');
                return id === e.record_id;
              }).length;

              return {
                id: e.record_id,
                title: e.fields.titel ?? '(Kein Titel)',
                subtitle: [
                  formatDatetime(e.fields.datum_uhrzeit),
                  spot?.fields.name,
                ]
                  .filter(Boolean)
                  .join(' · '),
                status: e.fields.skill_level
                  ? { key: e.fields.skill_level.key, label: e.fields.skill_level.label }
                  : undefined,
                stats: [
                  ...(e.fields.max_teilnehmer != null
                    ? [
                        {
                          label: 'Anmeldungen',
                          value: `${anmeldungenCount} / ${e.fields.max_teilnehmer}`,
                        },
                      ]
                    : []),
                  ...(e.fields.startgebuehr != null
                    ? [
                        {
                          label: 'Startgebühr',
                          value: `${e.fields.startgebuehr.toFixed(2)} €`,
                        },
                      ]
                    : []),
                ],
                icon: <IconCalendarEvent size={20} className="text-primary" />,
              };
            })}
            onSelect={handleEventSelect}
            searchPlaceholder="Event suchen..."
            emptyIcon={<IconCalendarEvent size={36} />}
            emptyText="Keine Events gefunden."
          />
        </div>
      )}

      {/* ── Step 2: Teilnehmerdaten ── */}
      {step === 2 && !success && (
        <div className="space-y-5">
          <EventInfoCard />

          <div className="rounded-2xl border bg-card p-5 space-y-5 overflow-hidden">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <IconUser size={16} className="text-primary" />
              Persönliche Daten
            </h2>

            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vorname">
                  Vorname <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vorname"
                  value={form.vorname}
                  onChange={(e) => handleFormChange('vorname', e.target.value)}
                  placeholder="Max"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nachname">
                  Nachname <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nachname"
                  value={form.nachname}
                  onChange={(e) => handleFormChange('nachname', e.target.value)}
                  placeholder="Mustermann"
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Geburtsdatum */}
            <div className="space-y-1.5">
              <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
              <Input
                id="geburtsdatum"
                type="date"
                value={form.geburtsdatum}
                onChange={(e) => handleFormChange('geburtsdatum', e.target.value)}
              />
            </div>

            {/* Kontakt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  E-Mail <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="max@beispiel.de"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  type="tel"
                  value={form.telefon}
                  onChange={(e) => handleFormChange('telefon', e.target.value)}
                  placeholder="+49 123 456789"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Skill Level */}
            <div className="space-y-2">
              <Label>Skill-Level</Label>
              <div className="flex flex-wrap gap-2">
                {skillLevelOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      handleFormChange('skill_level', form.skill_level === opt.key ? '' : opt.key)
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.skill_level === opt.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Board-Stil */}
            <div className="space-y-2">
              <Label>Board-Stil (Mehrfachauswahl)</Label>
              <div className="flex flex-wrap gap-2">
                {boardStilOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleBoardStil(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.board_stil.includes(opt.key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anmerkungen */}
            <div className="space-y-1.5">
              <Label htmlFor="anmerkungen">Anmerkungen</Label>
              <textarea
                id="anmerkungen"
                value={form.anmerkungen}
                onChange={(e) => handleFormChange('anmerkungen', e.target.value)}
                placeholder="Optionale Hinweise, Fragen oder besondere Bedürfnisse..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Teilnahmebedingungen */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-secondary/30">
              <input
                id="teilnahmebedingungen"
                type="checkbox"
                checked={form.teilnahmebedingungen}
                onChange={(e) => handleFormChange('teilnahmebedingungen', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border cursor-pointer"
              />
              <Label htmlFor="teilnahmebedingungen" className="cursor-pointer leading-relaxed text-sm">
                Ich stimme den Teilnahmebedingungen zu <span className="text-destructive">*</span>
              </Label>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
              <IconArrowLeft size={15} stroke={2} />
              Zurück
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!isStep2Valid()}
              className="flex-1 gap-1.5"
            >
              Weiter zur Bestätigung
              <IconArrowRight size={15} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Bestätigung ── */}
      {step === 3 && !success && (
        <div className="space-y-5">
          <EventInfoCard />

          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b bg-secondary/30">
              <h2 className="font-semibold text-sm text-foreground">Zusammenfassung</h2>
            </div>
            <div className="divide-y">
              <SummaryRow label="Name" value={`${form.vorname} ${form.nachname}`} />
              <SummaryRow label="E-Mail" value={form.email} />
              {form.telefon && <SummaryRow label="Telefon" value={form.telefon} />}
              {form.geburtsdatum && <SummaryRow label="Geburtsdatum" value={form.geburtsdatum} />}
              <SummaryRow label="Skill-Level" value={form.skill_level ? selectedSkillLabel : '—'} />
              <SummaryRow label="Board-Stil" value={selectedBoardStilLabels} />
              {form.anmerkungen && <SummaryRow label="Anmerkungen" value={form.anmerkungen} />}
              <SummaryRow
                label="Teilnahmebedingungen"
                value={form.teilnahmebedingungen ? 'Zugestimmt' : 'Nicht zugestimmt'}
              />
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
              <IconArrowLeft size={15} stroke={2} />
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 gap-1.5"
            >
              {submitting ? (
                <>
                  <IconRefresh size={15} stroke={2} className="animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <IconCheck size={15} stroke={2.5} />
                  Jetzt anmelden
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Erfolgszustand ── */}
      {success && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-8 flex flex-col items-center text-center gap-4 overflow-hidden">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <IconCheck size={28} stroke={2.5} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Anmeldung erfolgreich!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {form.vorname} {form.nachname} wurde erfolgreich für{' '}
                <span className="font-medium text-foreground">
                  {selectedEvent?.fields.titel ?? 'das Event'}
                </span>{' '}
                angemeldet.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <Button onClick={handleAnotherPerson} variant="outline" className="flex-1">
                Weitere Person anmelden
              </Button>
              <Button onClick={handleOtherEvent} variant="outline" className="flex-1">
                Anderes Event
              </Button>
            </div>
            <a
              href="#/"
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Zurück zum Dashboard
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="text-xs text-muted-foreground w-36 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm font-medium text-foreground flex-1 min-w-0 break-words">{value}</span>
    </div>
  );
}
