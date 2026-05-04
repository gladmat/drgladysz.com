// src/lib/strings.ts
//
// Small string utilities. Kept tiny so callsites don't pull a heavyweight
// dependency for one-line helpers.

/**
 * Capitalise the first character of a string, preserving the case of every
 * subsequent character. Used for glossary term display where every entry
 * should read as a sentence-style heading regardless of how the term appears
 * in body text (e.g. "carpal tunnel" → "Carpal tunnel"; "Phalen test" stays
 * unchanged; "kanał nadgarstka" → "Kanał nadgarstka"). Handles Polish
 * diacritics correctly via String.toUpperCase() locale fallback.
 *
 * Differs from CSS `text-transform: capitalize` which capitalises every
 * word's first letter — that would turn "Phalen test" into "Phalen Test"
 * and "carpal tunnel" into "Carpal Tunnel", neither of which is what we
 * want. This helper only touches the first character.
 */
export function capFirst(value: string | null | undefined): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
