import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { SkateparksSpots } from '@/types/app';
import {
  IconMapPin,
  IconCalendarEvent,
  IconCheck,
  IconPlus,
  IconAlertCircle,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Skatepark wählen' },
  { label: 'Event-Details' },
  { label: 'Bestätigen' },
];

const kategorieOptions = LOOKUP_OPTIONS['event_verwaltung']?.['kategorie'] ?? [];
const skillLevelOptions = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

interface EventForm {
  titel: string;
  kategorie: string;
  datum_uhrzeit: string;
  beschreibung: string;
  skill_level: string;
  max_teilnehmer: string;
  startgebuehr: string;
  kontakt_email: string;
  event_website: string;
}

const EMPTY_FORM: EventForm = {
  titel: '',
  kategorie: '',
  datum_uhrzeit: '',
  beschreibung: '',
  skill_level: '',
  max_teilnehmer: '',
  startgebuehr: '',
  kontakt_email: '',
  event_website: '',
};

export default function EventErstellenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { skateparksSpots, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState<number>(1);
  const [selectedSkatepark, setSelectedSkatepark] = useState<SkateparksSpots | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Deep-linking: read ?skateparkId= and ?step= from URL on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    const urlSkateparkId = searchParams.get('skateparkId');

    if (urlSkateparkId && skateparksSpots.length > 0) {
      const found = skateparksSpots.find(s => s.record_id === urlSkateparkId);
      if (found) {
        setSelectedSkatepark(found);
        if (urlStep >= 2 && urlStep <= 3) {
          setStep(urlStep);
        } else {
          setStep(2);
        }
        return;
      }
    }

    if (urlStep >= 1 && urlStep <= 3) {
      setStep(urlStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skateparksSpots]);

  // Sync step + skateparkId to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (step > 1) {
      params.set('step', String(step));
    } else {
      params.delete('step');
    }
    if (selectedSkatepark) {
      params.set('skateparkId', selectedSkatepark.record_id);
    } else {
      params.delete('skateparkId');
    }
    setSearchParams(params, { replace: true });
  }, [step, selectedSkatepark, searchParams, setSearchParams]);

  const handleSkateparkSelect = (id: string) => {
    const found = skateparksSpots.find(s => s.record_id === id) ?? null;
    setSelectedSkatepark(found);
    setStep(2);
  };

  const handleFormChange = (field: keyof EventForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!form.titel.trim()) {
      setFormError('Bitte gib einen Titel für das Event ein.');
      return false;
    }
    if (!form.datum_uhrzeit) {
      setFormError('Bitte wähle Datum und Uhrzeit aus.');
      return false;
    }
    return true;
  };

  const handleFormNext = () => {
    if (!validateForm()) return;
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedSkatepark) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ortUrl = createRecordUrl(APP_IDS.SKATEPARKS_SPOTS, selectedSkatepark.record_id);
      await LivingAppsService.createEventVerwaltungEntry({
        titel: form.titel.trim(),
        kategorie: form.kategorie || undefined,
        datum_uhrzeit: form.datum_uhrzeit || undefined,
        beschreibung: form.beschreibung.trim() || undefined,
        skill_level: form.skill_level || undefined,
        max_teilnehmer: form.max_teilnehmer ? Number(form.max_teilnehmer) : undefined,
        startgebuehr: form.startgebuehr ? Number(form.startgebuehr) : undefined,
        ort: ortUrl,
        kontakt_email: form.kontakt_email.trim() || undefined,
        event_website: form.event_website.trim() || undefined,
      });
      await fetchAll();
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Erstellen des Events.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedSkatepark(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSubmitError(null);
    setSuccess(false);
    setStep(1);
  };

  const skateparkAdresse = (sp: SkateparksSpots) => {
    const parts = [sp.fields.strasse, sp.fields.hausnummer].filter(Boolean).join(' ');
    return [parts, sp.fields.stadt].filter(Boolean).join(', ');
  };

  const formatDatumUhrzeit = (value: string) => {
    if (!value) return '–';
    const [datePart, timePart] = value.split('T');
    if (!datePart) return value;
    const [year, month, day] = datePart.split('-');
    return `${day}.${month}.${year}${timePart ? ` um ${timePart} Uhr` : ''}`;
  };

  // Success screen
  if (success) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            Zurück zum Dashboard
          </a>
          <h1 className="text-2xl font-bold tracking-tight">Event erstellen</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <IconCheck size={32} className="text-green-600" stroke={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Event erfolgreich erstellt!</h2>
            <p className="text-sm text-muted-foreground">
              Das Event <span className="font-semibold text-foreground">"{form.titel}"</span> wurde angelegt.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReset} variant="outline">
              <IconPlus size={16} stroke={2} className="mr-2" />
              Weiteres Event erstellen
            </Button>
            <a href="#/">
              <Button>Zurück zum Dashboard</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Event erstellen"
      subtitle="Plane ein neues Skate-Event in 3 Schritten"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Schritt 1: Skatepark auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <EntitySelectStep
            items={skateparksSpots.map(sp => ({
              id: sp.record_id,
              title: sp.fields.name ?? '(Kein Name)',
              subtitle: skateparkAdresse(sp),
              status: sp.fields.untergrundtyp
                ? { key: sp.fields.untergrundtyp.key, label: sp.fields.untergrundtyp.label }
                : undefined,
              icon: <IconMapPin size={20} className="text-primary" stroke={1.8} />,
            }))}
            onSelect={handleSkateparkSelect}
            searchPlaceholder="Skatepark suchen..."
            emptyIcon={<IconMapPin size={32} />}
            emptyText="Kein Skatepark gefunden."
          />
        </div>
      )}

      {/* Schritt 2: Event-Details */}
      {step === 2 && selectedSkatepark && (
        <div className="space-y-5">
          {/* Info-Karte: ausgewählter Skatepark */}
          <div className="flex items-start gap-3 p-4 rounded-xl border bg-primary/5 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconMapPin size={20} className="text-primary" stroke={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Ausgewählter Skatepark</p>
              <p className="font-semibold text-foreground truncate">{selectedSkatepark.fields.name ?? '–'}</p>
              <p className="text-sm text-muted-foreground truncate">{skateparkAdresse(selectedSkatepark)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              className="shrink-0 text-muted-foreground"
            >
              Ändern
            </Button>
          </div>

          {/* Inline-Formular */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Titel */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Titel <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.titel}
                  onChange={e => handleFormChange('titel', e.target.value)}
                  placeholder="z.B. Summer Skate Jam 2026"
                  className="w-full"
                />
              </div>

              {/* Kategorie */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Kategorie</label>
                <select
                  value={form.kategorie}
                  onChange={e => handleFormChange('kategorie', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">– Bitte wählen –</option>
                  {kategorieOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Datum & Uhrzeit */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Datum & Uhrzeit <span className="text-destructive">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={form.datum_uhrzeit}
                  onChange={e => handleFormChange('datum_uhrzeit', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Skill Level */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Skill-Level</label>
                <select
                  value={form.skill_level}
                  onChange={e => handleFormChange('skill_level', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">– Bitte wählen –</option>
                  {skillLevelOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Max. Teilnehmer */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Max. Teilnehmer</label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_teilnehmer}
                  onChange={e => handleFormChange('max_teilnehmer', e.target.value)}
                  placeholder="z.B. 50"
                  className="w-full"
                />
              </div>

              {/* Startgebühr */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Startgebühr (€)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.startgebuehr}
                  onChange={e => handleFormChange('startgebuehr', e.target.value)}
                  placeholder="z.B. 10"
                  className="w-full"
                />
              </div>

              {/* Kontakt-E-Mail */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Kontakt-E-Mail</label>
                <Input
                  type="email"
                  value={form.kontakt_email}
                  onChange={e => handleFormChange('kontakt_email', e.target.value)}
                  placeholder="kontakt@example.com"
                  className="w-full"
                />
              </div>

              {/* Event-Website */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Event-Website</label>
                <Input
                  type="url"
                  value={form.event_website}
                  onChange={e => handleFormChange('event_website', e.target.value)}
                  placeholder="https://..."
                  className="w-full"
                />
              </div>

              {/* Beschreibung */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-foreground">Beschreibung</label>
                <textarea
                  value={form.beschreibung}
                  onChange={e => handleFormChange('beschreibung', e.target.value)}
                  placeholder="Beschreibe das Event..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <IconAlertCircle size={16} stroke={2} className="shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 sm:flex-none">
                Zurück
              </Button>
              <Button onClick={handleFormNext} className="flex-1 sm:flex-none">
                Weiter zur Bestätigung
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schritt 3: Bestätigung */}
      {step === 3 && selectedSkatepark && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <IconCalendarEvent size={18} className="text-primary" stroke={1.8} />
                <h3 className="font-semibold text-foreground">Event-Zusammenfassung</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <SummaryRow label="Titel" value={form.titel || '–'} />
              <SummaryRow label="Skatepark" value={selectedSkatepark.fields.name ?? '–'} />
              <SummaryRow
                label="Adresse"
                value={skateparkAdresse(selectedSkatepark) || '–'}
              />
              <SummaryRow
                label="Datum & Uhrzeit"
                value={formatDatumUhrzeit(form.datum_uhrzeit)}
              />
              <SummaryRow
                label="Kategorie"
                value={kategorieOptions.find(o => o.key === form.kategorie)?.label ?? '–'}
              />
              <SummaryRow
                label="Skill-Level"
                value={skillLevelOptions.find(o => o.key === form.skill_level)?.label ?? '–'}
              />
              <SummaryRow
                label="Max. Teilnehmer"
                value={form.max_teilnehmer ? `${form.max_teilnehmer} Personen` : '–'}
              />
              <SummaryRow
                label="Startgebühr"
                value={form.startgebuehr ? `${Number(form.startgebuehr).toFixed(2)} €` : 'Kostenlos'}
              />
              {form.kontakt_email && (
                <SummaryRow label="Kontakt-E-Mail" value={form.kontakt_email} />
              )}
              {form.event_website && (
                <SummaryRow label="Event-Website" value={form.event_website} />
              )}
              {form.beschreibung && (
                <div className="pt-1 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Beschreibung</p>
                  <p className="text-sm text-foreground">{form.beschreibung}</p>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <IconAlertCircle size={16} stroke={2} className="shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} disabled={submitting} className="flex-1 sm:flex-none">
              Zurück
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 sm:flex-none">
              {submitting ? 'Wird erstellt...' : 'Event erstellen'}
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right truncate">{value}</span>
    </div>
  );
}
