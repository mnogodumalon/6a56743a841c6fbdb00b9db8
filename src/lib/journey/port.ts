/**
 * Journey port — the ONE data surface a journey step is written against.
 *
 * It is deliberately the PUBLIC subset (list · create · ref): a step that
 * only sees this type runs under `#/intents/<slug>` (authenticated,
 * `servicePort` from `@/services/journeyPort`) and under `#/public/<slug>`
 * (anonymous, `createPublicPort` from `@/lib/journey/publicPort`) unchanged.
 * `update` / `delete` do not exist here on purpose: an anonymous visitor must
 * never modify an existing record, and a step that needs to (undo, edit)
 * belongs to the internal wrapper page, not to the shared step. Writing
 * `port.update(...)` is a TypeScript error, not a gate finding.
 */
import { FIELD_RULES, type EntityKey } from './rules';

export interface JourneyRecord {
  /** 24 lowercase hex chars — the platform record id. */
  id: string;
  fields: Record<string, unknown>;
  createdAt: string | null;
}

export interface JourneyPort {
  readonly door: 'internal' | 'public';
  list(entity: EntityKey, opts?: { limit?: number }): Promise<JourneyRecord[]>;
  /** Takes FORM values (record ids, lookup keys, ISO strings). The wire form
   *  (record URLs, sliced dates) is derived here — never assemble it by hand. */
  create(entity: EntityKey, values: Record<string, unknown>): Promise<JourneyRecord>;
  /** The applookup value for a record of app `appId`, in the form this door
   *  needs (REST URL internally, grant-scoped ref publicly). */
  ref(appId: string, recordId: string): string;
}

export class JourneyPortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JourneyPortError';
  }
}

const RECORD_ID_RE = /^[a-f0-9]{24}$/i;

function lookupKeyOf(v: unknown): unknown {
  return typeof v === 'object' && v !== null && 'key' in v ? (v as { key: string }).key : v;
}

/** Form values → wire payload for `port.create`.
 *
 *  - record ids become refs via `port.ref` (multi: one per id)
 *  - `undefined` / `''` are dropped, `null` passes (explicit clear)
 *  - dates are sliced to the platform precision, numbers parsed (`1,5` ok)
 *  - lookup values may be `{key,label}` objects or plain keys
 *  - non-writable fields (file, geo) and unknown keys pass through untouched;
 *    the service / the grant validates them */
export function toWirePayload(
  entity: EntityKey,
  values: Record<string, unknown>,
  port: JourneyPort,
): Record<string, unknown> {
  const rules = (FIELD_RULES as Record<string, Record<string, { kind: string; targetAppId?: string }>>)[entity] ?? {};
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (raw === undefined || raw === '') continue;
    const rule = rules[key];
    if (!rule || raw === null) {
      out[key] = raw;
      continue;
    }
    switch (rule.kind) {
      case 'record': {
        const id = String(raw);
        out[key] = RECORD_ID_RE.test(id) && rule.targetAppId ? port.ref(rule.targetAppId, id) : id;
        break;
      }
      case 'multirecord': {
        const ids = Array.isArray(raw) ? raw.map(String) : [String(raw)];
        out[key] = ids.map(id => (RECORD_ID_RE.test(id) && rule.targetAppId ? port.ref(rule.targetAppId, id) : id));
        break;
      }
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
        if (Number.isFinite(n)) out[key] = n;
        break;
      }
      case 'date':
        out[key] = String(raw).slice(0, 10);
        break;
      case 'datetime':
        out[key] = String(raw).slice(0, 16);
        break;
      case 'lookup':
        out[key] = lookupKeyOf(raw);
        break;
      case 'multilookup':
        out[key] = Array.isArray(raw) ? raw.map(lookupKeyOf) : [lookupKeyOf(raw)];
        break;
      default:
        out[key] = raw;
    }
  }
  return out;
}
