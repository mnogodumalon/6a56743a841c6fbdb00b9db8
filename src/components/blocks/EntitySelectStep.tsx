import { useState, useMemo, type ReactNode } from 'react';
import { IconSearch, IconChevronRight, IconCheck, IconPlus } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStatusColor } from '@/components/blocks/StatusBadge';
import { t } from '@/i18n';

/**
 * EntitySelectStep — "pick a record" as people expect it from a customer
 * picker (Stripe), a guest list (Airbnb host tools) or a triage list (Linear):
 * search on top, compact cards in a grid, each card recognisable at a glance —
 * an initials avatar (or your icon), the title, ONE secondary line, a status
 * pill and up to three facts. The current pick is highlighted, so returning
 * to the step ("Ändern") shows what was chosen.
 *
 * Cards are only as good as their facts: pass `subtitle` and `stats` from the
 * fields users recognise a record by (the `^` fields of the entity summary),
 * not from bookkeeping columns.
 */
export interface SelectItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: { key: string; label: string };
  stats?: { label: string; value: string | number }[];
  icon?: ReactNode;
}

export interface EntitySelectStepProps {
  items: SelectItem[];
  onSelect: (id: string) => void;
  /** Highlights the current pick (e.g. `form.get('gast') as string`). */
  selectedId?: string | null;
  searchPlaceholder?: string;
  emptyIcon?: ReactNode;
  emptyText?: string;
  /** Label for the "create new" button. If set, the button is shown above the list. */
  createLabel?: string;
  /** Called when the "create new" button is clicked. Use this to reveal the
   *  step's own mini-form (never the generic {Entity}Dialog). */
  onCreateNew?: () => void;
  /** Optional: render the mini-form panel alongside the list. */
  createDialog?: ReactNode;
  /** Card columns on wide screens. Default: 2 from four items on, else 1. */
  columns?: 1 | 2;
}

// Eight calm pastel pairs (background / ink) — a deterministic hue per record
// so the same guest always gets the same colour and neighbours differ.
const AVATAR_TONES: Array<[string, string]> = [
  ['#fbe9df', '#9a3a0f'],
  ['#e7f0fb', '#1f4d8f'],
  ['#e9f5ee', '#1a6b42'],
  ['#fdf3df', '#8a5a00'],
  ['#f1e9fb', '#5b2e9a'],
  ['#e6f5f7', '#13636f'],
  ['#fbe8ef', '#8f2447'],
  ['#eef1f5', '#3d4653'],
];

function toneFor(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function initialsOf(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  const first = words[0].replace(/^[^\p{L}\p{N}]+/u, '');
  const last = words.length > 1 ? words[words.length - 1].replace(/^[^\p{L}\p{N}]+/u, '') : '';
  const a = first.charAt(0);
  const b = last.charAt(0) || first.charAt(1);
  return (a + b).toUpperCase() || '·';
}

export function EntitySelectStep({
  items,
  onSelect,
  selectedId,
  // Destructuring defaults are evaluated on every render, so these follow a
  // language switch without any extra wiring.
  searchPlaceholder = t('search'),
  emptyIcon,
  emptyText = t('no_results'),
  createLabel,
  onCreateNew,
  createDialog,
  columns,
}: EntitySelectStepProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(q) ||
      (item.subtitle ?? '').toLowerCase().includes(q) ||
      (item.stats ?? []).some(s => String(s.value).toLowerCase().includes(q))
    );
  }, [items, search]);

  const cols = columns ?? (items.length >= 4 ? 2 : 1);

  return (
    <div className="space-y-3">
      {/* Search + Create New row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {filtered.length}/{items.length}
            </span>
          )}
        </div>
        {onCreateNew && (
          <Button type="button" variant="outline" onClick={onCreateNew} className="shrink-0 gap-1.5">
            <IconPlus size={15} aria-hidden="true" />
            {createLabel ?? t('step_create_new')}
          </Button>
        )}
      </div>

      {/* createDialog slot — the step's own inline mini-form (never the
          generic {Entity}Dialog; check-intents fails the build on that import) */}
      {createDialog}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {emptyIcon && <div className="mb-3 flex justify-center opacity-40">{emptyIcon}</div>}
          <p className="text-sm">{emptyText}</p>
          {onCreateNew && (
            <Button type="button" variant="outline" size="sm" onClick={onCreateNew} className="mt-3 gap-1.5">
              <IconPlus size={14} aria-hidden="true" />
              {createLabel ?? t('step_create_new')}
            </Button>
          )}
        </div>
      ) : (
        <ul className={`grid gap-2 list-none m-0 p-0 ${cols === 2 ? 'sm:grid-cols-2' : ''}`}>
          {filtered.map(item => {
            const selected = selectedId != null && item.id === selectedId;
            const [bg, ink] = toneFor(item.id);
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-pressed={selected}
                  className={`w-full h-full text-left flex items-start gap-3 p-3.5 rounded-2xl border transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent hover:border-primary/40'
                  }`}
                >
                  {item.icon ? (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      {item.icon}
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold tracking-wide"
                      style={{ backgroundColor: bg, color: ink }}
                      aria-hidden="true"
                    >
                      {initialsOf(item.title)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </span>
                      {item.status && (
                        // Colours come from StatusBadge's single table (getStatusColor)
                        // so a status looks the same here as on its badge. Its classes
                        // include a border-* colour, which stays inert without a
                        // `border` width utility — this pill deliberately has none.
                        <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(item.status.key)}`}>
                          {item.status.label}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                    )}
                    {item.stats && item.stats.length > 0 && (
                      <div className="flex gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {item.stats.slice(0, 3).map((s, i) => (
                          <span key={i} className="whitespace-nowrap">
                            {s.label}: <span className="font-medium text-foreground tabular-nums">{s.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {selected ? (
                    <IconCheck size={16} className="text-primary shrink-0 mt-2.5" aria-hidden="true" />
                  ) : (
                    <IconChevronRight size={16} className="text-muted-foreground shrink-0 mt-2.5 group-hover:text-primary transition-colors" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
