/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - skateparks_spots: name (Name des Ortes), strasse (Straße), hausnummer (Hausnummer), postleitzahl (Postleitzahl), stadt (Stadt)
 *   - anmeldungen: event (Event), vorname (Vorname), nachname (Nachname), email (E-Mail-Adresse), skill_level (Skill-Level), teilnahmebedingungen (Ich stimme den Teilnahmebedingungen zu)
 *   - event_verwaltung: titel (Titel des Events), kategorie (Kategorie), datum_uhrzeit (Datum und Uhrzeit), ort (Ort)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "skateparks_spots": "name" | "strasse" | "hausnummer" | "postleitzahl" | "stadt" | "beschreibung" | "untergrundtyp" | "standort" | "website";
  "anmeldungen": "event" | "vorname" | "nachname" | "geburtsdatum" | "email" | "telefon" | "skill_level" | "board_stil" | "anmerkungen" | "teilnahmebedingungen";
  "event_verwaltung": "titel" | "kategorie" | "datum_uhrzeit" | "beschreibung" | "skill_level" | "max_teilnehmer" | "startgebuehr" | "ort" | "kontakt_email" | "event_website" | "kontakt_telefon" | "notizen";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  skateparks_spots: { name: "Bitte den Namen des Ortes eingeben.", strasse: "Bitte die Straße eingeben.", hausnummer: "Bitte die Hausnummer eingeben.", postleitzahl: "Bitte die Postleitzahl eingeben.", stadt: "Bitte die Stadt eingeben." },
  anmeldungen: { event: "Bitte ein Event auswählen.", vorname: "Bitte den Vornamen eingeben.", nachname: "Bitte den Nachnamen eingeben.", email: "Bitte die E-Mail-Adresse eingeben.", skill_level: "Bitte das Skill-Level wählen.", teilnahmebedingungen: "Bitte den Teilnahmebedingungen zustimmen." },
  event_verwaltung: { titel: "Bitte den Titel des Events eingeben.", kategorie: "Bitte eine Kategorie wählen.", datum_uhrzeit: "Bitte Datum und Uhrzeit wählen.", ort: "Bitte einen Ort auswählen." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
