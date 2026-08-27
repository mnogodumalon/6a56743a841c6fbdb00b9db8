/**
 * Event Anlegen — 2-Schritt-Wizard.
 * Steps: 1) Skatepark auswählen (EntitySelectStep, alle Skateparks qualifizieren) →
 *        2) Event-Details eingeben & anlegen (Mini-Formular) →
 *        Bestätigungsanzeige mit Zusammenfassung.
 * Reads: skateparks_spots. Writes: event_verwaltung (createEventVerwaltungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  IconMapPin,
  IconCalendarEvent,
  IconCheck,
  IconPlus,
} from '@tabler/icons-react';

import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useDashboardData } from '@/hooks/useDashboardData';
import type { SkateparksSpots } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx } from '@/i18n';

// Lookup option arrays (safe access with ?. and ?? [])
const KATEGORIE_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['kategorie'] ?? [];
const SKILL_LEVEL_OPTIONS = LOOKUP_OPTIONS['event_verwaltung']?.['skill_level'] ?? [];

// New Skatepark mini-form state shape
interface NewSkateparkForm {
  name: string;
  stadt: string;
  untergrundKey: string;
}

export default function EventAnlegenPage() {
  const { skateparksSpots, loading, error, fetchAll } = useDashboardData();

  // Wizard step (1-based)
  const [step, setStep] = useState(1);

  // Step 1 — selected skatepark
  const [selectedSkatepark, setSelectedSkatepark] = useState<SkateparksSpots | null>(null);

  // Step 1 — new skatepark mini-form
  const [showCreateSkatepark, setShowCreateSkatepark] = useState(false);
  const [newSkatepark, setNewSkatepark] = useState<NewSkateparkForm>({
    name: '',
    stadt: '',
    untergrundKey: 'none',
  });
  const [createSkateparkBusy, setCreateSkateparkBusy] = useState(false);

  // Step 2 — event detail fields
  const [titel, setTitel] = useState('');
  const [kategorieKey, setKategorieKey] = useState(KATEGORIE_OPTIONS[0]?.key ?? '');
  const [datumUhrzeit, setDatumUhrzeit] = useState('');
  const [skillLevelKey, setSkillLevelKey] = useState('none');
  const [maxTeilnehmer, setMaxTeilnehmer] = useState('');
  const [startgebuehr, setStartgebuehr] = useState('');
  const [kontaktEmail, setKontaktEmail] = useState('');
  const [beschreibung, setBeschreibung] = useState('');

  // Submission state
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventTitel, setCreatedEventTitel] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // --- Handlers ---

  const handleSkateparkSelect = (id: string) => {
    const all = Object.values(skateparksSpots ?? {}) as SkateparksSpots[];
    const found = all.find((s) => s.record_id === id) ?? null;
    setSelectedSkatepark(found);
    setStep(2);
  };

  const handleCreateSkatepark = async () => {
    if (!newSkatepark.name.trim() || !newSkatepark.stadt.trim()) return;
    setCreateSkateparkBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: newSkatepark.name.trim(),
        stadt: newSkatepark.stadt.trim(),
      };
      if (newSkatepark.untergrundKey && newSkatepark.untergrundKey !== 'none') {
        payload.untergrundtyp = newSkatepark.untergrundKey;
      }
      const created = await LivingAppsService.createSkateparksSpot(payload);
      await fetchAll();
      setShowCreateSkatepark(false);
      setNewSkatepark({ name: '', stadt: '', untergrundKey: 'none' });
      // Auto-select the newly created skatepark and advance
      const all = Object.values(skateparksSpots ?? {}) as SkateparksSpots[];
      const fresh = all.find((s) => s.record_id === created.record_id) ?? null;
      setSelectedSkatepark(
        fresh ?? ({
          record_id: created.record_id,
          created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          updated_at: null,
          createdat: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          updatedat: null,
          fields: {
            name: newSkatepark.name.trim(),
            stadt: newSkatepark.stadt.trim(),
          },
        } as SkateparksSpots)
      );
      setStep(2);
    } catch {
      // keep form open on error
    } finally {
      setCreateSkateparkBusy(false);
    }
  };

  const handleSubmitEvent = async () => {
    if (!selectedSkatepark || !titel.trim() || !kategorieKey || !datumUhrzeit) return;
    // Idempotency guard — if already created, skip
    if (createdEventId) {
      setStep(3);
      return;
    }
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        titel: titel.trim(),
        kategorie: kategorieKey,
        datum_uhrzeit: datumUhrzeit, // already in yyyy-MM-ddTHH:mm from datetime-local input
        ort: createRecordUrl(APP_IDS.SKATEPARKS_SPOTS, selectedSkatepark.record_id),
      };
      if (skillLevelKey && skillLevelKey !== 'none') {
        payload.skill_level = skillLevelKey;
      }
      if (maxTeilnehmer.trim()) {
        payload.max_teilnehmer = Number(maxTeilnehmer);
      }
      if (startgebuehr.trim()) {
        payload.startgebuehr = Number(startgebuehr);
      }
      if (kontaktEmail.trim()) {
        payload.kontakt_email = kontaktEmail.trim();
      }
      if (beschreibung.trim()) {
        payload.beschreibung = beschreibung.trim();
      }

      const result = await LivingAppsService.createEventVerwaltungEntry(payload);
      setCreatedEventId(result.record_id);
      setCreatedEventTitel(titel.trim());
      setStep(3);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : tx('Das Event konnte nicht angelegt werden.')
      );
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSkatepark(null);
    setShowCreateSkatepark(false);
    setNewSkatepark({ name: '', stadt: '', untergrundKey: 'none' });
    setTitel('');
    setKategorieKey(KATEGORIE_OPTIONS[0]?.key ?? '');
    setDatumUhrzeit('');
    setSkillLevelKey('none');
    setMaxTeilnehmer('');
    setStartgebuehr('');
    setKontaktEmail('');
    setBeschreibung('');
    setSubmitError(null);
    setCreatedEventId(null);
    setCreatedEventTitel(null);
  };

  // Derived data
  const skateparkList = Object.values(skateparksSpots ?? {}) as SkateparksSpots[];

  const isStep2Valid =
    !!selectedSkatepark && !!titel.trim() && !!kategorieKey && !!datumUhrzeit;

  // Untergrundtyp options for new skatepark form
  const UNTERGRUND_OPTIONS = LOOKUP_OPTIONS['skateparks_spots']?.['untergrundtyp'] ?? [];

  return (
    <IntentWizardShell
      title={tx('Event anlegen')}
      subtitle={tx('Wähle einen Skatepark und gib die Event-Details ein.')}
      steps={[{ label: tx('Skatepark') }, { label: tx('Event-Details') }, { label: tx('Fertig') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Skatepark auswählen ─────────────────────────────── */}
      {step === 1 && (
        <EntitySelectStep
          items={skateparkList.map((s) => ({
            id: s.record_id,
            title: s.fields.name ?? tx('(Kein Name)'),
            subtitle: [
              s.fields.stadt,
              s.fields.untergrundtyp?.label,
            ]
              .filter(Boolean)
              .join(' · '),
            icon: <IconMapPin size={20} className="text-primary" />,
          }))}
          onSelect={handleSkateparkSelect}
          searchPlaceholder={tx('Skatepark suchen …')}
          emptyText={tx('Kein Skatepark gefunden')}
          emptyIcon={<IconMapPin size={32} className="text-muted-foreground" />}
          createLabel={tx('Neuen Skatepark anlegen')}
          onCreateNew={() => setShowCreateSkatepark(true)}
          createDialog={
            showCreateSkatepark ? (
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <p className="text-sm font-medium text-foreground">{tx('Neuen Skatepark anlegen')}</p>

                <div className="space-y-2">
                  <Label htmlFor="sp-name">{tx('Name *')}</Label>
                  <Input
                    id="sp-name"
                    value={newSkatepark.name}
                    onChange={(e) =>
                      setNewSkatepark((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={tx('z. B. Skatepark Mitte')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sp-stadt">{tx('Stadt *')}</Label>
                  <Input
                    id="sp-stadt"
                    value={newSkatepark.stadt}
                    onChange={(e) =>
                      setNewSkatepark((prev) => ({ ...prev, stadt: e.target.value }))
                    }
                    placeholder={tx('z. B. Berlin')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sp-untergrund">{tx('Untergrundtyp')}</Label>
                  <Select
                    value={newSkatepark.untergrundKey}
                    onValueChange={(v) =>
                      setNewSkatepark((prev) => ({ ...prev, untergrundKey: v }))
                    }
                  >
                    <SelectTrigger id="sp-untergrund" className="w-full">
                      <SelectValue placeholder={tx('Untergrund wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Kein Untergrundtyp')}</SelectItem>
                      {UNTERGRUND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateSkatepark(false);
                      setNewSkatepark({ name: '', stadt: '', untergrundKey: 'none' });
                    }}
                  >
                    {tx('Abbrechen')}
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={
                      !newSkatepark.name.trim() ||
                      !newSkatepark.stadt.trim() ||
                      createSkateparkBusy
                    }
                    onClick={handleCreateSkatepark}
                  >
                    <IconPlus size={16} className="mr-1" />
                    {createSkateparkBusy ? tx('Wird angelegt …') : tx('Anlegen')}
                  </Button>
                </div>
              </div>
            ) : null
          }
        />
      )}

      {/* ── Step 2: Event-Details ────────────────────────────────────── */}
      {step === 2 && (
        selectedSkatepark ? (
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Selected skatepark context banner */}
            <div className="rounded-2xl border bg-secondary/50 px-4 py-3 flex items-center gap-3">
              <IconMapPin size={20} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{tx('Gewählter Skatepark')}</p>
                <p className="font-medium truncate">
                  {selectedSkatepark.fields.name ?? tx('(Kein Name)')}
                  {selectedSkatepark.fields.stadt
                    ? ` · ${selectedSkatepark.fields.stadt}`
                    : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => setStep(1)}
              >
                {tx('Ändern')}
              </Button>
            </div>

            {/* Event-Titel */}
            <div className="space-y-2">
              <Label htmlFor="ev-titel">{tx('Titel *')}</Label>
              <Input
                id="ev-titel"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder={tx('z. B. Sommerjam 2026')}
              />
            </div>

            {/* Kategorie */}
            <div className="space-y-2">
              <Label htmlFor="ev-kategorie">{tx('Kategorie *')}</Label>
              <Select value={kategorieKey} onValueChange={setKategorieKey}>
                <SelectTrigger id="ev-kategorie" className="w-full">
                  <SelectValue placeholder={tx('Kategorie wählen …')} />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORIE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datum & Uhrzeit */}
            <div className="space-y-2">
              <Label htmlFor="ev-datum">{tx('Datum & Uhrzeit *')}</Label>
              <Input
                id="ev-datum"
                type="datetime-local"
                value={datumUhrzeit}
                onChange={(e) => setDatumUhrzeit(e.target.value)}
              />
            </div>

            {/* Skill Level */}
            <div className="space-y-2">
              <Label htmlFor="ev-skill">{tx('Skill-Level')}</Label>
              <Select value={skillLevelKey} onValueChange={setSkillLevelKey}>
                <SelectTrigger id="ev-skill" className="w-full">
                  <SelectValue placeholder={tx('Skill-Level wählen …')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tx('Kein Skill-Level')}</SelectItem>
                  {SKILL_LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max. Teilnehmer & Startgebühr — side by side on wider screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ev-max">{tx('Max. Teilnehmer')}</Label>
                <Input
                  id="ev-max"
                  type="number"
                  min={1}
                  value={maxTeilnehmer}
                  onChange={(e) => setMaxTeilnehmer(e.target.value)}
                  placeholder="z. B. 50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-gebuehr">{tx('Startgebühr (€)')}</Label>
                <Input
                  id="ev-gebuehr"
                  type="number"
                  min={0}
                  step="0.01"
                  value={startgebuehr}
                  onChange={(e) => setStartgebuehr(e.target.value)}
                  placeholder="z. B. 10"
                />
              </div>
            </div>

            {/* Kontakt-E-Mail */}
            <div className="space-y-2">
              <Label htmlFor="ev-email">{tx('Kontakt-E-Mail')}</Label>
              <Input
                id="ev-email"
                type="email"
                value={kontaktEmail}
                onChange={(e) => setKontaktEmail(e.target.value)}
                placeholder={tx('kontakt@example.com')}
              />
            </div>

            {/* Beschreibung */}
            <div className="space-y-2">
              <Label htmlFor="ev-beschreibung">{tx('Beschreibung')}</Label>
              <Textarea
                id="ev-beschreibung"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder={tx('Infos zum Event …')}
                rows={4}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                {tx('Zurück')}
              </Button>
              <Button
                className="flex-1"
                disabled={!isStep2Valid || submitBusy}
                onClick={handleSubmitEvent}
              >
                <IconCalendarEvent size={16} className="mr-1" />
                {submitBusy ? tx('Wird angelegt …') : tx('Event anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          /* Safety fallback when step=2 is accessed without a selection */
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}

      {/* ── Step 3: Bestätigung ─────────────────────────────────────── */}
      {step === 3 && (
        createdEventId && createdEventTitel ? (
          <div className="text-center py-12 space-y-6 max-w-md mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <IconCheck size={32} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{tx('Event angelegt!')}</h2>
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">{createdEventTitel}</span>{' '}
                {tx('wurde erfolgreich bei')}{' '}
                <span className="font-medium text-foreground">
                  {selectedSkatepark?.fields.name ?? tx('dem Skatepark')}
                </span>{' '}
                {tx('angelegt.')}
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border bg-card p-4 text-left space-y-3">
              {selectedSkatepark?.fields.stadt && (
                <div className="flex items-start gap-2">
                  <IconMapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">
                    {selectedSkatepark.fields.stadt}
                  </span>
                </div>
              )}
              {datumUhrzeit && (
                <div className="flex items-start gap-2">
                  <IconCalendarEvent size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">
                    {datumUhrzeit.replace('T', ' · ')}
                  </span>
                </div>
              )}
              {maxTeilnehmer && (
                <div className="text-sm text-muted-foreground">
                  {tx('Max.')} {maxTeilnehmer} {tx('Teilnehmer')}
                  {startgebuehr ? tx` · Startgebühr: ${startgebuehr} €` : ''}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                {tx('Weiteres Event anlegen')}
              </Button>
              <a href="#/" className="flex-1">
                <Button className="w-full">{tx('Zurück zum Dashboard')}</Button>
              </a>
            </div>
          </div>
        ) : (
          /* Safety fallback when step=3 is accessed without a created event */
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Daten aus Schritt 2.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
