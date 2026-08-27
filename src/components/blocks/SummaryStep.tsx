import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { IconAlertCircle, IconCheck, IconCircleDashed, IconLoader2, IconX } from '@tabler/icons-react';
import { t } from '@/i18n';
import { entityLabel, isEmptyValue, labelOf } from '@/lib/journey/rules';
import type { StepForm, SummaryItem } from '@/lib/journey/useStepForm';
import type { JourneySubmit, PlanStep } from '@/lib/journey/useJourneySubmit';
import { useWizard } from './IntentWizardShell';

/**
 * SummaryStep — "Check your answers" before anything is written.
 *
 *   <SummaryStep forms={[buchung]} submit={submit} whatHappensNext="Die Buchung erscheint sofort im Belegungsplan." />
 *
 * Every answer, grouped by the step that asked it, with a "Change" link that
 * jumps back to that step AND puts focus into the field; Continue there
 * returns here. Missing required fields are listed as links and disable
 * Confirm — the page never computes that itself. While the plan runs, every
 * write shows its own status; a failure keeps the entries, names what is
 * already saved and offers a retry that only repeats what failed.
 *
 * `forms` and `submit` are required by type: a summary cannot be rendered
 * without the data it summarizes or the runner it confirms.
 */
export interface SummaryStepProps {
  forms: StepForm[];
  submit: JourneySubmit;
  title?: string;
  /** One or two sentences: what happens after Confirm. */
  whatHappensNext?: ReactNode;
  confirmLabel?: string;
  /** Extra rows the forms do not know about (a computed total, a picked option). */
  items?: SummaryItem[];
  /** Override the jump: default uses the shell (goTo step + focus field + return here). */
  onEdit?: (step: number, fieldId: string) => void;
  /** Rendered between the answers and the confirm area. */
  children?: ReactNode;
}

function stepLabelOf(step: PlanStep): string {
  if (step.label) return step.label;
  if (step.entity) return entityLabel(step.entity);
  return step.key;
}

export function SummaryStep({
  forms,
  submit,
  title,
  whatHappensNext,
  confirmLabel,
  items = [],
  onEdit,
  children,
}: SummaryStepProps) {
  const wizard = useWizard();

  // The rows below ARE the answers — the shell's chips above would double them.
  const suppressChips = wizard?.suppressChips;
  useEffect(() => suppressChips?.(), [suppressChips]);

  const rows: SummaryItem[] = [...forms.flatMap(f => f.summary()), ...items];
  const groups = new Map<number | undefined, SummaryItem[]>();
  for (const row of rows) {
    const list = groups.get(row.step) ?? [];
    list.push(row);
    groups.set(row.step, list);
  }
  const groupKeys = [...groups.keys()].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));

  const missing = forms.flatMap(f =>
    f.keys
      .filter(k => f.required(k) && isEmptyValue(f.values[k]))
      .map(k => ({ label: labelOf(f.entity, k), fieldId: f.fieldId(k), step: f.stepOf(k) })),
  );

  const edit = (step: number | undefined, fieldId: string) => {
    if (step === undefined) return;
    if (onEdit) onEdit(step, fieldId);
    else wizard?.goTo(step, { focus: fieldId, returnTo: wizard.step });
  };

  const canEdit = (step: number | undefined) => step !== undefined && (Boolean(onEdit) || Boolean(wizard));
  const showPlan = submit.plan.length > 1 && (submit.submitting || submit.error !== null || submit.doneCount > 0);
  const savedLabels = submit.plan.filter(s => submit.status[s.key] === 'done').map(stepLabelOf);

  return (
    <div className="space-y-6" data-journey-summary="">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title ?? t('ss_title')}</h2>
      </div>

      {groupKeys.map(step => (
        <section key={step ?? 'none'} className="rounded-2xl border border-border bg-card overflow-hidden">
          {step !== undefined && (
            <h3 className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border">
              {wizard?.steps[step - 1]?.label ?? t('ss_step_of', { n: step })}
            </h3>
          )}
          <dl className="divide-y divide-border">
            {(groups.get(step) ?? []).map(row => (
              <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-5 py-3 items-baseline">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-medium break-words col-span-2 sm:col-span-1 order-3 sm:order-none">{row.value}</dd>
                <div className="justify-self-end">
                  {canEdit(row.step) && (
                    <button
                      type="button"
                      onClick={() => edit(row.step, row.fieldId)}
                      className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                      aria-label={`${t('ss_change')}: ${row.label}`}
                    >
                      {t('ss_change')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {children}

      {missing.length > 0 && (
        <p role="alert" className="text-sm text-destructive flex flex-wrap items-center gap-x-1.5">
          <IconAlertCircle size={16} aria-hidden="true" />
          <span>{t('ss_missing')}</span>
          {missing.map((m, i) => (
            <span key={m.fieldId}>
              {canEdit(m.step) ? (
                <button type="button" onClick={() => edit(m.step, m.fieldId)} className="underline underline-offset-2 hover:no-underline">
                  {m.label}
                </button>
              ) : (
                m.label
              )}
              {i < missing.length - 1 ? ',' : ''}
            </span>
          ))}
        </p>
      )}

      {showPlan && (
        <ol className="rounded-2xl border border-border bg-card divide-y divide-border" aria-live="polite">
          {submit.plan.map(step => {
            const s = submit.status[step.key] ?? 'idle';
            return (
              <li key={step.key} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                {s === 'done' && <IconCheck size={16} className="text-primary shrink-0" aria-hidden="true" />}
                {s === 'failed' && <IconX size={16} className="text-destructive shrink-0" aria-hidden="true" />}
                {s === 'running' && <IconLoader2 size={16} className="animate-spin text-muted-foreground shrink-0" aria-hidden="true" />}
                {s === 'idle' && <IconCircleDashed size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />}
                <span className="font-medium">{stepLabelOf(step)}</span>
                <span className="text-muted-foreground">
                  {s === 'done' ? t('ss_step_done') : s === 'failed' ? t('ss_step_failed') : s === 'running' ? t('ss_step_running') : t('ss_step_idle')}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {submit.error && (
        <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 space-y-2">
          <p className="font-semibold text-destructive">{t('ss_error_title')}</p>
          <p className="text-sm text-muted-foreground break-words">{submit.error.message}</p>
          {savedLabels.length > 0 && (
            <p className="text-sm">{t('ss_partial', { done: savedLabels.join(', ') })}</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void submit.retry()} disabled={submit.submitting}>
            {t('ss_retry')}
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-border pt-4">
        {whatHappensNext && <p className="text-sm text-muted-foreground flex-1">{whatHappensNext}</p>}
        <Button
          type="button"
          onClick={() => void submit.run()}
          disabled={submit.submitting || missing.length > 0}
          className="gap-2 sm:ml-auto"
          data-journey-confirm=""
        >
          {submit.submitting && <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />}
          {submit.submitting ? t('ss_submitting') : (confirmLabel ?? t('ss_confirm'))}
        </Button>
      </div>
    </div>
  );
}
