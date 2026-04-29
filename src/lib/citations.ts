// src/lib/citations.ts
//
// Build-time citation pipeline. Converts Sanity reference documents into
// Vancouver/AMA-formatted strings used by:
//   - Bibliography.astro (full numbered reference list at end of article)
//   - Citation.astro     (sidenote/popover compact label)
//
// Two paths:
//   - Native Vancouver formatter (default) — pure JS, no external deps,
//     produces correct AMA/Vancouver output for the 95% case (journal
//     articles, books, chapters, online sources, guidelines).
//   - citation-js + CSL "vancouver" template (opt-in) — for callers who want
//     the canonical CSL output. Behind a flag because CSL bundles citeproc and
//     adds significant build-time overhead; the native formatter is enough
//     for everything we render.
//
// All formatting runs at build time. Zero JS shipped to the browser for
// citation rendering.

import type { SanityRefDoc } from './sanity';

// ---------------------------------------------------------------------------
// Author name parsing
// ---------------------------------------------------------------------------

/**
 * Parses "Smith JK" → { family: "Smith", given: "JK" }.
 * Supports compound surnames with hyphens ("Müller-Vahl JK") and particles
 * ("van der Berg JK" → family "van der Berg", given "JK"). Heuristic: the
 * given name is the trailing token of mostly-uppercase ≤ 4 chars (initials).
 * Everything before that is the family name.
 */
export function parseAuthorName(raw: string): { family: string; given: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { family: '', given: '' };

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1) {
    return { family: tokens[0], given: '' };
  }

  const last = tokens[tokens.length - 1];
  const looksLikeInitials =
    last.length <= 4 && last === last.toUpperCase() && /^[A-Z.]+$/.test(last);

  if (looksLikeInitials) {
    return {
      family: tokens.slice(0, -1).join(' '),
      given: last,
    };
  }
  // Fallback: treat first token as given, rest as family.
  return {
    family: tokens.slice(1).join(' '),
    given: tokens[0],
  };
}

/**
 * ICMJE / Vancouver author-list rule: list up to six authors, then "et al."
 * Each author is rendered as "Family Initials" (no comma, run-together initials).
 */
export function formatAuthorList(authors: string[]): string {
  if (authors.length === 0) return '';
  const visible = authors.slice(0, 6);
  const rendered = visible.map((a) => {
    const { family, given } = parseAuthorName(a);
    const initials = given.replace(/\./g, '').replace(/\s+/g, '');
    return initials ? `${family} ${initials}` : family;
  });
  const tail = authors.length > 6 ? ', et al' : '';
  return rendered.join(', ') + tail;
}

// ---------------------------------------------------------------------------
// HTML escaping for the Vancouver string output
// ---------------------------------------------------------------------------

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const ESCAPE_RE = /[&<>"']/g;
function esc(input: string | undefined): string {
  if (!input) return '';
  return input.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c]);
}

// ---------------------------------------------------------------------------
// Vancouver formatter (HTML output)
// ---------------------------------------------------------------------------

/**
 * Returns Vancouver-formatted HTML for a single reference. The journal/source
 * is wrapped in <em> per AMA style; everything else is plain text. Includes
 * trailing PubMed/DOI links if identifiers are present.
 *
 * Examples:
 *   Journal:    Smith JK, Jones AB. Title here. <em>J Hand Surg Am</em>. 2024;49(2):123-30.
 *   Book:       Smith JK. Book title. 3rd ed. London: Publisher; 2024.
 *   Chapter:    Smith JK. Chapter. In: Editor AB, ed. Book. London: Publisher; 2024:123-30.
 *   Online:     Smith JK. Title. <em>Source</em>. 2024. Available at: https://...
 */
export function formatVancouver(
  ref: SanityRefDoc,
  options: { withLinks?: boolean } = {},
): string {
  const { withLinks = true } = options;
  const authors = formatAuthorList(ref.authors);
  const title = esc(ref.title);
  const source = esc(ref.journal);
  const year = ref.year;
  const pubType = ref.pubType ?? 'journal';

  const parts: string[] = [];

  // Author list
  if (authors) parts.push(`${esc(authors)}.`);

  // Title — Vancouver: not italicised, ends with a period, sentence case as
  // entered (we don't transform case — the editor enters as the journal
  // requires).
  if (title) parts.push(`${title}.`);

  if (pubType === 'book') {
    // Smith JK. Book title. 3rd ed. London: Publisher; 2024.
    if (ref.edition) parts.push(`${esc(ref.edition)} ed.`);
    const imprint = [esc(ref.publisherLocation), esc(ref.publisher)]
      .filter(Boolean)
      .join(': ');
    if (imprint) parts.push(`${imprint}; ${year}.`);
    else parts.push(`${year}.`);
  } else if (pubType === 'chapter') {
    // Smith JK. Chapter. In: Editor AB, ed. Book title. 3rd ed. London: Publisher; 2024:123-30.
    const editorList = ref.editors ? formatAuthorList(ref.editors) : '';
    const editorPart = editorList
      ? `In: ${esc(editorList)}, ed${ref.editors && ref.editors.length > 1 ? 's' : ''}.`
      : 'In:';
    parts.push(editorPart);
    if (source) parts.push(`<em>${source}</em>.`);
    if (ref.edition) parts.push(`${esc(ref.edition)} ed.`);
    const imprint = [esc(ref.publisherLocation), esc(ref.publisher)]
      .filter(Boolean)
      .join(': ');
    const tail = imprint
      ? `${imprint}; ${year}${ref.pages ? `:${esc(ref.pages)}` : ''}.`
      : `${year}${ref.pages ? `:${esc(ref.pages)}` : ''}.`;
    parts.push(tail);
  } else if (pubType === 'guideline' || pubType === 'online') {
    // Smith JK. Title. <em>Source</em>. 2024. Available at: https://...
    if (source) parts.push(`<em>${source}</em>.`);
    parts.push(`${year}.`);
    if (ref.url) {
      const safeUrl = esc(ref.url);
      parts.push(`Available at: ${safeUrl}.`);
    }
  } else {
    // Default: journal article (also conference proceedings).
    if (source) parts.push(`<em>${source}</em>.`);
    let citation = `${year}`;
    if (ref.volume) citation += `;${esc(ref.volume)}`;
    if (ref.issue) citation += `(${esc(ref.issue)})`;
    if (ref.pages) citation += `:${esc(ref.pages)}`;
    parts.push(`${citation}.`);
  }

  let main = parts.join(' ');

  if (withLinks) {
    const tail: string[] = [];
    if (ref.pmid) {
      tail.push(
        `<a class="ref-link" href="https://pubmed.ncbi.nlm.nih.gov/${esc(ref.pmid)}/" target="_blank" rel="noopener">PubMed</a>`,
      );
    }
    if (ref.doi) {
      tail.push(
        `<a class="ref-link" href="https://doi.org/${esc(ref.doi)}" target="_blank" rel="noopener">DOI</a>`,
      );
    }
    if (ref.pmcid) {
      const pmcid = ref.pmcid.replace(/^PMC/i, '');
      tail.push(
        `<a class="ref-link" href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${esc(pmcid)}/" target="_blank" rel="noopener">PMC</a>`,
      );
    }
    if (tail.length > 0) {
      main += ` <span class="ref-actions">${tail.join(' ')}</span>`;
    }
  }

  return main;
}

// ---------------------------------------------------------------------------
// Sidenote / popover compact label
// ---------------------------------------------------------------------------

/**
 * Author-year-journal compact label for the sidenote / popover.
 * Format: "Smith et al. <em>J Hand Surg Am</em>. 2024;49(2):123-30."
 * Author truncation: 1 author → "Smith JK", 2 → "Smith JK, Jones AB",
 * 3+ → "Smith JK et al."
 */
export function formatShortRef(ref: SanityRefDoc): string {
  const authors = ref.authors;
  let authorPart = '';
  if (authors.length === 1) {
    const { family, given } = parseAuthorName(authors[0]);
    authorPart = given ? `${family} ${given}` : family;
  } else if (authors.length === 2) {
    const a = parseAuthorName(authors[0]);
    const b = parseAuthorName(authors[1]);
    authorPart = `${a.family} ${a.given}, ${b.family} ${b.given}`.trim();
  } else if (authors.length >= 3) {
    const { family, given } = parseAuthorName(authors[0]);
    authorPart = given ? `${family} ${given} et al.` : `${family} et al.`;
  }

  let citation = `${ref.year}`;
  if (ref.volume) citation += `;${ref.volume}`;
  if (ref.issue) citation += `(${ref.issue})`;
  if (ref.pages) citation += `:${ref.pages}`;

  // authorPart may already end in a period (e.g. "Smith JK et al."). Strip a
  // trailing period before appending our own to avoid doubled punctuation.
  const cleanAuthor = authorPart.replace(/\.$/, '');
  const sourcePart = ref.journal ? `<em>${esc(ref.journal)}</em>. ` : '';
  return `${esc(cleanAuthor)}. ${sourcePart}${citation}.`;
}

/**
 * Even shorter "callable" label for in-prose use ("Smith 2024" style),
 * useful where a title-style chip is preferred over a numbered superscript.
 */
export function formatAuthorYear(ref: SanityRefDoc): string {
  const first = ref.authors[0];
  if (!first) return `${ref.year}`;
  const { family } = parseAuthorName(first);
  const tail = ref.authors.length > 1 ? ' et al.' : '';
  return `${family}${tail} ${ref.year}`;
}

// ---------------------------------------------------------------------------
// PubMed / DOI deep links
// ---------------------------------------------------------------------------

export function pubmedUrl(pmid: string | undefined): string | null {
  if (!pmid) return null;
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

export function doiUrl(doi: string | undefined): string | null {
  if (!doi) return null;
  return `https://doi.org/${doi}`;
}

export function pmcUrl(pmcid: string | undefined): string | null {
  if (!pmcid) return null;
  const cleaned = pmcid.replace(/^PMC/i, '');
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${cleaned}/`;
}
