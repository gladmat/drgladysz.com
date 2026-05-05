// site/scripts/seed-dupuytren-package.ts
//
// Multi-piece seeder for the Dupuytren EN content package at
// 01-brand-system/inbox/Dupuytren EN/. Ingests:
//   - 1 patient article  (article doc, audience: patient, category: patient)
//   - 1 FESSH-prep article (article doc, audience: peer, category: fessh-prep)
//   - 1 PNF procedure page (procedurePage doc, audience: mixed, category: hand-surgery)
//   - 1 LF procedure page  (procedurePage doc, audience: mixed, category: hand-surgery)
//   - 87 deduplicated bibReference docs (slug-form _id from bibliography.json)
//   - 35 deduplicated glossaryTerm docs (slug-form _id from glossary.json)
//   - 4 cross-link patches (relatedArticles + relatedProcedures from cross-links.json)
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   # Validate without writing to Sanity (no token needed):
//   node --experimental-strip-types scripts/seed-dupuytren-package.ts --dry-run
//
//   # Live seed against production:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/seed-dupuytren-package.ts
//
// Idempotent: createOrReplace + slug-fallback dedup. Re-running with the same
// inputs is safe.
//
// Body content uses the Dupuytren-package inline DSL:
//   [g:slug|displayed text]   — glossary mark (resolves through glossary.json)
//   {n}    or {n,m}           — citation marks (resolves through per-piece mapping table)
//   **bold**                  — strong
//   *italic*                  — em
//   [text](url)               — markdown link
// Body recognised structures:
//   ## h2, ### h3
//   - bullet, * bullet, 1. number list (single-line items)
//   > blockquote → callout (pearl when starts with '**Pitfall —')
//   horizontal rule (---) → block boundary; ignored otherwise
//   `## § NN — SectionName` (procedure pages) → routed to schema section field
//   `### Step N — Title` (within § 06 Key Steps) → procedureStep object

import { createClient } from '@sanity/client';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// ============================================================================
// Config
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_DIR = resolve(__dirname, '../../01-brand-system/inbox/Dupuytren EN');
const AUTHOR_ID = '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472';

const dryRun = process.argv.includes('--dry-run');
const noPatch = process.argv.includes('--no-cross-links');

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91';
const DATASET = process.env.PUBLIC_SANITY_DATASET || 'production';
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';

if (!dryRun && !TOKEN) {
  console.error(
    '✗ Missing SANITY_API_DEVELOPER_TOKEN (or SANITY_API_WRITE_TOKEN). Pass --dry-run to validate without writing.',
  );
  process.exit(1);
}

const client = dryRun
  ? null
  : createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: '2026-01-01',
      token: TOKEN,
      useCdn: false,
    });

// ============================================================================
// Types
// ============================================================================

type Span = {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
};

type MarkDef = {
  _type: 'citation' | 'glossaryTerm' | 'link';
  _key: string;
  reference?: { _type: 'reference'; _ref: string };
  term?: { _type: 'reference'; _ref: string };
  href?: string;
};

type Block = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h2' | 'h3' | 'blockquote';
  markDefs: MarkDef[];
  children: Span[];
  listItem?: 'bullet' | 'number';
  level?: number;
};

type Callout = {
  _type: 'callout';
  _key: string;
  type: 'info' | 'warning' | 'pearl';
  title?: string;
  content: Block[];
};

type ContentItem = Block | Callout;

type ProcedureStep = {
  _type: 'procedureStep';
  _key: string;
  title: string;
  description: Block[];
  pitfall?: string;
};

type SanityDoc = { _id: string; _type: string; [k: string]: unknown };

// ============================================================================
// Normalisation maps (schema-side enum reconciliation)
// ============================================================================

const GLOSSARY_CATEGORY_REMAP: Record<string, string> = {
  // Pass-through valid values
  anatomy: 'anatomy',
  condition: 'condition',
  procedure: 'procedure',
  investigation: 'investigation',
  treatment: 'treatment',
  outcome: 'outcome',
  structure: 'structure',
  other: 'other',
  // Package extras → closest schema enum
  'outcome-measure': 'outcome',
  pharmacology: 'treatment',
  symptom: 'condition',
  classification: 'other',
};

const PUBTYPE_REMAP: Record<string, string> = {
  // Pass-through valid values
  journal: 'journal',
  book: 'book',
  chapter: 'chapter',
  conference: 'conference',
  online: 'online',
  guideline: 'guideline',
  // Package extras → closest schema enum
  'journal-article': 'journal',
  'book-chapter': 'chapter',
  regulatory: 'guideline',
  'society-document': 'guideline',
  'conference-paper': 'conference',
  preprint: 'online',
};

// Procedure-page § NN section name → schema field name
const PROCEDURE_SECTION_FIELD_MAP: Record<string, string> = {
  '01': 'indications',
  '02': 'contraindications',
  '03': 'anatomy',
  '04': 'positioning',
  '05': 'approach',
  '06': 'keySteps', // specially parsed
  '07': 'closure',
  '08': 'aftercare',
  '09': 'complications',
  '10': 'evidence',
};

// ============================================================================
// Key counters (stable IDs across the run; reset per piece for tidiness)
// ============================================================================

let _spanCounter = 0;
let _markCounter = 0;
let _blockCounter = 0;
let _calloutCounter = 0;
let _stepCounter = 0;
const resetKeys = () => {
  _spanCounter = 0;
  _markCounter = 0;
  _blockCounter = 0;
  _calloutCounter = 0;
  _stepCounter = 0;
};
const nextSpanKey = () => `s${++_spanCounter}`;
const nextMarkKey = (prefix: 'c' | 'g' | 'l') => `${prefix}${++_markCounter}`;
const nextBlockKey = () => `b${++_blockCounter}`;
const nextCalloutKey = () => `cb${++_calloutCounter}`;
const nextStepKey = () => `step${++_stepCounter}`;

// ============================================================================
// Frontmatter + mapping-table parsing
// ============================================================================

function parseFrontmatter(md: string): { frontmatter: Record<string, unknown>; body: string } {
  const lines = md.split('\n');
  if (lines[0].trim() !== '---') {
    throw new Error('No frontmatter found (must start with `---`)');
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx < 0) {
    throw new Error('Unterminated frontmatter (no closing `---`)');
  }
  const frontmatterRaw = lines.slice(1, endIdx).join('\n');
  const body = lines.slice(endIdx + 1).join('\n');
  const frontmatter = yaml.load(frontmatterRaw) as Record<string, unknown>;
  return { frontmatter, body };
}

function stripInlineReferencesSection(body: string): string {
  // Some article bodies (notably the EN FESSH-prep) ship with an inline
  // `## References` Vancouver list — the same content the [slug].astro
  // template will render as a `<Bibliography>` from the citation marks.
  // Strip the inline section so the bibliography only renders once.
  // Caught by audit on 2026-05-05 after the FESSH-prep bibliography
  // appeared twice on the live page.
  const marker = /^##\s+References\s*$/m;
  const m = body.match(marker);
  if (!m) return body;
  const idx = body.indexOf(m[0]);
  return body.slice(0, idx).trimEnd();
}

function extractCitationMappingTable(body: string): {
  bodyWithoutTable: string;
  mapping: Map<number, string>;
} {
  // The mapping table is at the foot, introduced by:
  //   ## Citation position to bibliography slug mapping
  // and contains a fenced code block with `N → slug` lines.
  const marker = /^##\s+Citation position to bibliography slug mapping\s*$/m;
  const m = body.match(marker);
  if (!m) {
    throw new Error('No citation position mapping table found in body');
  }
  const tableStartIdx = body.indexOf(m[0]);
  const before = body.slice(0, tableStartIdx);
  const tableSection = body.slice(tableStartIdx);

  const codeFenceStart = tableSection.indexOf('```');
  if (codeFenceStart < 0) {
    throw new Error('Mapping-table section has no fenced code block');
  }
  const codeFenceEnd = tableSection.indexOf('```', codeFenceStart + 3);
  if (codeFenceEnd < 0) {
    throw new Error('Mapping-table fenced code block is unterminated');
  }
  const tableContents = tableSection.slice(codeFenceStart + 3, codeFenceEnd);

  const mapping = new Map<number, string>();
  for (const rawLine of tableContents.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim(); // strip trailing comments
    if (!line) continue;
    const m2 = line.match(/^(\d+)\s*→\s*([a-z0-9-]+)/);
    if (!m2) continue;
    const pos = Number(m2[1]);
    const slug = m2[2];
    mapping.set(pos, slug);
  }

  return { bodyWithoutTable: before.trimEnd(), mapping };
}

// ============================================================================
// Inline tokeniser
// ============================================================================

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'em'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'cite'; positions: number[] }
  | { type: 'gloss'; slug: string; displayed: string }
  | { type: 'link'; text: string; href: string };

const TOKEN_PATTERNS: Array<{
  regex: RegExp;
  build: (m: RegExpMatchArray) => InlineToken;
}> = [
  // ** before * to avoid greedy mismatch
  { regex: /^\*\*([^*\n]+)\*\*/, build: (m) => ({ type: 'strong', value: m[1] }) },
  { regex: /^\*([^*\n]+)\*/, build: (m) => ({ type: 'em', value: m[1] }) },
  // [g:slug|displayed text]
  {
    regex: /^\[g:([a-z0-9-]+)\|([^\]]+)\]/,
    build: (m) => ({ type: 'gloss', slug: m[1], displayed: m[2] }),
  },
  // {n} or {n,m,p} — Dupuytren citation positions
  {
    regex: /^\{(\d+(?:\s*,\s*\d+)*)\}/,
    build: (m) => ({
      type: 'cite',
      positions: m[1].split(',').map((s) => Number(s.trim())),
    }),
  },
  // [text](url)
  {
    regex: /^\[([^\]]+)\]\(([^)\s]+)\)/,
    build: (m) => ({ type: 'link', text: m[1], href: m[2] }),
  },
];

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let pos = 0;
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      tokens.push({ type: 'text', value: textBuf });
      textBuf = '';
    }
  };

  while (pos < text.length) {
    const slice = text.slice(pos);
    let matched = false;
    for (const { regex, build } of TOKEN_PATTERNS) {
      const m = slice.match(regex);
      if (m && m.index === 0) {
        flushText();
        tokens.push(build(m));
        pos += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      textBuf += text[pos];
      pos++;
    }
  }
  flushText();
  return tokens;
}

function tokensToBlock(
  tokens: InlineToken[],
  ctx: ResolveCtx,
): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];
  let pendingText = '';

  const flushText = (extraMarks: string[] = []) => {
    if (pendingText) {
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: pendingText,
        marks: extraMarks,
      });
      pendingText = '';
    }
  };

  for (const tok of tokens) {
    if (tok.type === 'text') {
      pendingText += tok.value;
    } else if (tok.type === 'em') {
      flushText();
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: tok.value,
        marks: ['em'],
      });
    } else if (tok.type === 'strong') {
      flushText();
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: tok.value,
        marks: ['strong'],
      });
    } else if (tok.type === 'link') {
      flushText();
      const markKey = nextMarkKey('l');
      markDefs.push({ _type: 'link', _key: markKey, href: tok.href });
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: tok.text,
        marks: [markKey],
      });
    } else if (tok.type === 'gloss') {
      const liveId = ctx.glossarySlugToId.get(tok.slug);
      if (!liveId) {
        throw new Error(`[g:${tok.slug}|...] references unknown glossary slug`);
      }
      flushText();
      const markKey = nextMarkKey('g');
      markDefs.push({
        _type: 'glossaryTerm',
        _key: markKey,
        term: { _type: 'reference', _ref: liveId },
      });
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: tok.displayed,
        marks: [markKey],
      });
    } else if (tok.type === 'cite') {
      // Resolve all positions to bibReference _ids; one markDef per position.
      const markKeys: string[] = [];
      for (const position of tok.positions) {
        const slug = ctx.citationMap.get(position);
        if (!slug) {
          throw new Error(
            `Citation {${position}} not found in mapping table for piece ${ctx.pieceLabel}`,
          );
        }
        const liveId = ctx.bibSlugToId.get(slug);
        if (!liveId) {
          throw new Error(
            `Citation {${position}} → ${slug} not in bibliography (piece ${ctx.pieceLabel})`,
          );
        }
        const markKey = nextMarkKey('c');
        markDefs.push({
          _type: 'citation',
          _key: markKey,
          reference: { _type: 'reference', _ref: liveId },
        });
        markKeys.push(markKey);
      }
      // Citation marks attach to the preceding text (existing site convention:
      // strip trailing whitespace before the marker so the rendered output is
      // `text¹,` not `text¹ ,`).
      if (pendingText) {
        const trimmed = pendingText.replace(/\s+$/, '');
        if (trimmed) {
          children.push({
            _type: 'span',
            _key: nextSpanKey(),
            text: trimmed,
            marks: markKeys,
          });
        } else {
          const last = children[children.length - 1];
          if (last) last.marks = [...last.marks, ...markKeys];
        }
        pendingText = '';
      } else {
        const last = children[children.length - 1];
        if (last) last.marks = [...last.marks, ...markKeys];
      }
    }
  }
  flushText();
  return { children, markDefs };
}

interface ResolveCtx {
  glossarySlugToId: Map<string, string>;
  bibSlugToId: Map<string, string>;
  citationMap: Map<number, string>;
  pieceLabel: string;
}

// ============================================================================
// Body builder — line-aware walker producing Block / Callout / paragraph
// ============================================================================

function buildContent(bodyMd: string, ctx: ResolveCtx): ContentItem[] {
  const lines = bodyMd.split('\n');
  const items: ContentItem[] = [];

  let paraBuf: string[] = [];
  // Blockquote buffer (multi-line blockquotes flush to a callout when a non-`> ` line breaks them).
  let quoteBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const text = paraBuf.join(' ').trim();
    paraBuf = [];
    if (!text) return;
    const { children, markDefs } = tokensToBlock(tokenizeInline(text), ctx);
    items.push({
      _type: 'block',
      _key: nextBlockKey(),
      style: 'normal',
      markDefs,
      children,
    });
  };

  const emitInlineBlock = (
    text: string,
    style: 'h2' | 'h3' | 'blockquote' | 'normal',
    listItem?: 'bullet' | 'number',
  ) => {
    const { children, markDefs } = tokensToBlock(tokenizeInline(text), ctx);
    const block: Block = {
      _type: 'block',
      _key: nextBlockKey(),
      style,
      markDefs,
      children,
    };
    if (listItem) {
      block.listItem = listItem;
      block.level = 1;
    }
    items.push(block);
  };

  const flushQuote = () => {
    if (quoteBuf.length === 0) return;
    const text = quoteBuf.join(' ').trim();
    quoteBuf = [];
    if (!text) return;
    // Detect pitfall pattern: starts with **Pitfall — ...**
    const pitfallMatch = text.match(/^\*\*Pitfall\s*—\s*([^*]+?)\.?\*\*\s*(.*)$/);
    let calloutType: 'pearl' | 'info' = 'info';
    let title: string | undefined;
    let calloutText = text;
    if (pitfallMatch) {
      calloutType = 'pearl';
      title = pitfallMatch[1].trim();
      calloutText = pitfallMatch[2].trim();
    }
    const { children, markDefs } = tokensToBlock(tokenizeInline(calloutText), ctx);
    const inner: Block = {
      _type: 'block',
      _key: nextBlockKey(),
      style: 'normal',
      markDefs,
      children,
    };
    const callout: Callout = {
      _type: 'callout',
      _key: nextCalloutKey(),
      type: calloutType,
      ...(title ? { title } : {}),
      content: [inner],
    };
    items.push(callout);
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim() === '') {
      flushPara();
      flushQuote();
      continue;
    }
    if (line.trim() === '---') {
      // Horizontal rule between sections — boundary, no output
      flushPara();
      flushQuote();
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushQuote();
      emitInlineBlock(line.slice(3).trim(), 'h2');
      continue;
    }
    if (line.startsWith('### ')) {
      flushPara();
      flushQuote();
      emitInlineBlock(line.slice(4).trim(), 'h3');
      continue;
    }
    if (line.startsWith('# ')) {
      // H1 — already stripped (title from frontmatter); ignore stray ones.
      flushPara();
      flushQuote();
      continue;
    }
    if (/^#{4,}\s/.test(line)) {
      throw new Error(`Heading level >h3 forbidden: "${line.slice(0, 60)}…"`);
    }
    if (line.startsWith('> ')) {
      flushPara();
      quoteBuf.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushPara();
      flushQuote();
      emitInlineBlock(line.slice(2).trim(), 'normal', 'bullet');
      continue;
    }
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushPara();
      flushQuote();
      emitInlineBlock(numberedMatch[1].trim(), 'normal', 'number');
      continue;
    }
    // Plain paragraph line; coalesce with surrounding plain lines.
    flushQuote();
    paraBuf.push(line);
  }
  flushPara();
  flushQuote();

  return items;
}

// ============================================================================
// Glossary + bibliography canonical loaders
// ============================================================================

interface GlossaryRawEntry {
  slug: string;
  term: string;
  category: string;
  shortDefinition: string;
  termPolish?: string;
  synonyms?: string[];
}

interface BibliographyRawEntry {
  _id: string;
  authors: string[];
  title: string;
  year: number;
  pubType: string;
  journal?: string;
  journalAbbreviation?: string;
  bookTitle?: string;
  publisher?: string;
  publisherLocation?: string;
  edition?: string;
  editors?: string[];
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  url?: string;
  abstractPreview?: string;
}

function stripAsterisks(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.replace(/^\*+|\*+$/g, '').trim();
}

function loadGlossary(): SanityDoc[] {
  const raw = JSON.parse(
    readFileSync(resolve(PACKAGE_DIR, 'glossary.json'), 'utf8'),
  ) as { entries: GlossaryRawEntry[] };

  const seen = new Set<string>();
  return raw.entries.map((e) => {
    if (seen.has(e.slug)) {
      throw new Error(`Duplicate glossary slug: ${e.slug}`);
    }
    seen.add(e.slug);

    const remappedCategory = GLOSSARY_CATEGORY_REMAP[e.category];
    if (!remappedCategory) {
      throw new Error(`Unknown glossary category: ${e.category} (slug ${e.slug})`);
    }

    const shortDef = e.shortDefinition.trim();
    if (shortDef.length > 450) {
      throw new Error(
        `Glossary ${e.slug} shortDefinition exceeds 450 chars (${shortDef.length})`,
      );
    }

    return {
      _id: `glossary-${e.slug}`,
      _type: 'glossaryTerm',
      term: e.term,
      slug: { _type: 'slug', current: e.slug },
      category: remappedCategory,
      shortDefinition: shortDef,
      ...(e.termPolish ? { termPolish: e.termPolish } : {}),
      ...(e.synonyms && e.synonyms.length > 0 ? { synonyms: e.synonyms } : {}),
    };
  });
}

function loadBibliography(): SanityDoc[] {
  const raw = JSON.parse(
    readFileSync(resolve(PACKAGE_DIR, 'bibliography.json'), 'utf8'),
  ) as { entries: BibliographyRawEntry[] };

  const seen = new Set<string>();
  return raw.entries.map((e) => {
    if (seen.has(e._id)) {
      throw new Error(`Duplicate bibliography _id: ${e._id}`);
    }
    seen.add(e._id);

    const remappedPubType = PUBTYPE_REMAP[e.pubType];
    if (!remappedPubType) {
      throw new Error(`Unknown pubType: ${e.pubType} (id ${e._id})`);
    }

    // Schema requires a `journal` string. Choose the best available source
    // depending on pubType and strip surrounding asterisks.
    let journalSource: string | undefined;
    if (remappedPubType === 'journal' || remappedPubType === 'online' || remappedPubType === 'conference') {
      journalSource = stripAsterisks(e.journalAbbreviation) ?? stripAsterisks(e.journal);
    } else if (remappedPubType === 'guideline') {
      journalSource = stripAsterisks(e.publisher) ?? stripAsterisks(e.journal) ?? 'Guideline';
    } else if (remappedPubType === 'chapter' || remappedPubType === 'book') {
      journalSource = stripAsterisks(e.bookTitle) ?? stripAsterisks(e.journal);
    }
    if (!journalSource) {
      throw new Error(
        `Bibliography ${e._id} has no journal/publisher/bookTitle (pubType ${remappedPubType})`,
      );
    }

    return {
      _id: e._id,
      _type: 'bibReference',
      title: stripAsterisks(e.title) ?? e.title,
      authors: e.authors,
      journal: journalSource,
      year: e.year,
      pubType: remappedPubType,
      ...(e.volume ? { volume: e.volume } : {}),
      ...(e.issue ? { issue: e.issue } : {}),
      ...(e.pages ? { pages: e.pages } : {}),
      ...(e.pmid ? { pmid: e.pmid } : {}),
      ...(e.pmcid ? { pmcid: e.pmcid } : {}),
      ...(e.doi ? { doi: e.doi } : {}),
      ...(e.url ? { url: e.url } : {}),
      ...(e.editors && e.editors.length > 0 ? { editors: e.editors } : {}),
      ...(e.publisher ? { publisher: stripAsterisks(e.publisher) } : {}),
      ...(e.publisherLocation ? { publisherLocation: e.publisherLocation } : {}),
      ...(e.edition ? { edition: e.edition } : {}),
      ...(e.abstractPreview ? { abstractPreview: e.abstractPreview } : {}),
    };
  });
}

// ============================================================================
// Article + procedure-page builders
// ============================================================================

interface ArticleFrontmatter {
  type?: string;
  slug: string;
  title: string;
  category: 'patient' | 'expert' | 'fessh-prep' | 'news';
  language: string;
  audience: 'patient' | 'peer' | 'mixed';
  publishedDate: string;
  lastUpdated: string;
  excerpt: string;
  standfirst: string;
  related_articles?: string[];
  related_procedures?: string[];
  authoring_notes?: string;
  package_version?: string;
  draft_version?: string;
  brand_spec?: string;
}

interface ProcedureFrontmatter {
  type?: string;
  slug: string;
  title: string;
  category: 'hand-surgery' | 'reconstructive-microsurgery' | 'skin-cancer';
  language: string;
  audience: 'patient' | 'peer' | 'mixed';
  last_clinically_reviewed: string;
  summary: string;
  brand_spec?: string;
  draft_version?: string;
  package_version?: string;
  related_articles?: string[];
  related_procedures?: string[];
  seo_title?: string;
  seo_description?: string;
  hero_image?: string;
  section_divider_image?: string;
  authoring_notes?: string;
}

// Strip the H1 line ("# Title") from the start of body markdown. The title
// is already in frontmatter; the body should not duplicate it as a block.
function stripBodyTitle(body: string): string {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && lines[i].startsWith('# ')) {
    return lines.slice(i + 1).join('\n').trimStart();
  }
  return body;
}

// ----- ARTICLE -----

interface ParsedKeyPointsBlock {
  question?: string;
  findings?: string;
  meaning?: string;
}

// Parse Key Points from the FESSH-prep article (definition-list format) or
// procedure pages (`**Question.** ...` block style). Patient article has none.
function extractKeyPoints(items: ContentItem[]): {
  keyPoints: ParsedKeyPointsBlock | null;
  remaining: ContentItem[];
} {
  const idx = items.findIndex(
    (it) =>
      it._type === 'block' &&
      (it as Block).style === 'h2' &&
      ((it as Block).children?.[0]?.text || '').toLowerCase().startsWith('key points'),
  );
  if (idx < 0) return { keyPoints: null, remaining: items };

  // Collect blocks until the next h2 boundary.
  let endIdx = items.length;
  for (let j = idx + 1; j < items.length; j++) {
    const b = items[j];
    if (b._type === 'block' && (b as Block).style === 'h2') {
      endIdx = j;
      break;
    }
  }
  const within = items.slice(idx + 1, endIdx);
  const remaining = [...items.slice(0, idx), ...items.slice(endIdx)];

  // Concatenate all spans from within into a single string per block, then
  // detect either (a) `Question` / `:   ...` definition-list pattern or
  // (b) `**Question.** ...` paragraph pattern.
  const flatTexts = within
    .filter((it) => it._type === 'block')
    .map((b) => (b as Block).children.map((c) => c.text).join('').trim())
    .filter((s) => s.length > 0);

  const kp: ParsedKeyPointsBlock = {};
  // Style B: paragraph form `**Question.** ...`
  for (const text of flatTexts) {
    const mq = text.match(/^Question[.:]\s*(.+)$/i);
    if (mq) {
      kp.question = mq[1].trim();
      continue;
    }
    const mf = text.match(/^Findings[.:]\s*(.+)$/i);
    if (mf) {
      kp.findings = mf[1].trim();
      continue;
    }
    const mm = text.match(/^Meaning[.:]\s*(.+)$/i);
    if (mm) {
      kp.meaning = mm[1].trim();
      continue;
    }
  }
  // Style A: dt/dd pairs — "Question" as one line, ":   ..." as next.
  for (let i = 0; i < flatTexts.length - 1; i++) {
    const dt = flatTexts[i];
    const dd = flatTexts[i + 1];
    if (/^Question$/i.test(dt) && dd.startsWith(':')) {
      kp.question = dd.replace(/^:\s*/, '').trim();
    }
    if (/^Findings$/i.test(dt) && dd.startsWith(':')) {
      kp.findings = dd.replace(/^:\s*/, '').trim();
    }
    if (/^Meaning$/i.test(dt) && dd.startsWith(':')) {
      kp.meaning = dd.replace(/^:\s*/, '').trim();
    }
  }

  const hasAny = kp.question || kp.findings || kp.meaning;
  return { keyPoints: hasAny ? kp : null, remaining };
}

function buildArticleDoc(fm: ArticleFrontmatter, items: ContentItem[]): SanityDoc {
  const { keyPoints, remaining } = extractKeyPoints(items);
  const body = remaining;

  // The article schema's `body` field accepts blocks, callouts, and images.
  // Our content is blocks + callouts; emit verbatim.
  const doc: SanityDoc = {
    _id: `article-${fm.slug}`,
    _type: 'article',
    title: fm.title,
    slug: { _type: 'slug', current: fm.slug },
    category: fm.category,
    language: fm.language ?? 'en',
    audience: fm.audience,
    author: { _type: 'reference', _ref: AUTHOR_ID },
    publishedDate: fm.publishedDate,
    lastUpdated: fm.lastUpdated,
    excerpt: fm.excerpt.length > 280 ? fm.excerpt.slice(0, 277).trimEnd() + '…' : fm.excerpt,
    standfirst: fm.standfirst,
    body,
  };
  if (keyPoints) {
    doc.keyPoints = keyPoints;
  }
  return doc;
}

// ----- PROCEDURE PAGE -----

function blocksOnly(items: ContentItem[]): Block[] {
  // Some schema sections (procedureStep.description) accept only blocks, no callouts.
  // Coerce: if a callout slips through, flatten its contents.
  const out: Block[] = [];
  for (const it of items) {
    if (it._type === 'block') out.push(it);
    else if (it._type === 'callout') out.push(...it.content);
  }
  return out;
}

function buildProcedureKeySteps(items: ContentItem[]): ProcedureStep[] {
  const steps: ProcedureStep[] = [];
  let currentStep: ProcedureStep | null = null;
  let currentBuf: ContentItem[] = [];

  const flushStep = () => {
    if (!currentStep) return;
    // Walk currentBuf: any pearl callout becomes the step's pitfall (the step
    // schema's `pitfall` field is a single text, not a callout). Take the
    // first pearl callout if multiple appear.
    let pitfall: string | undefined;
    const description: ContentItem[] = [];
    for (const it of currentBuf) {
      if (it._type === 'callout' && it.type === 'pearl' && !pitfall) {
        // Reconstruct pitfall as a flat string from the callout's content.
        const innerText = it.content
          .map((b) =>
            (b.children || [])
              .map((c) => c.text)
              .join('')
              .trim(),
          )
          .filter(Boolean)
          .join(' ');
        const titlePrefix = it.title ? `Pitfall — ${it.title}. ` : '';
        pitfall = `${titlePrefix}${innerText}`.trim();
      } else {
        description.push(it);
      }
    }
    currentStep.description = blocksOnly(description);
    if (pitfall) currentStep.pitfall = pitfall;
    if (currentStep.description.length > 0 || pitfall) steps.push(currentStep);
    currentStep = null;
    currentBuf = [];
  };

  for (const it of items) {
    if (
      it._type === 'block' &&
      (it as Block).style === 'h3' &&
      /^Step\s+\d+/i.test(((it as Block).children[0]?.text || '').trim())
    ) {
      flushStep();
      const titleText = (it as Block).children[0]?.text || '';
      // Strip "Step N — " prefix from the title for cleaner Studio display.
      const cleaned = titleText.replace(/^Step\s+\d+\s*[—-]\s*/, '').trim();
      currentStep = {
        _type: 'procedureStep',
        _key: nextStepKey(),
        title: cleaned,
        description: [],
      };
    } else {
      if (currentStep) {
        currentBuf.push(it);
      }
      // Items before the first ### Step are introductory text; drop or merge into Approach?
      // For § 06 Key Steps, the intro paragraphs are conventional — they describe the
      // overall flow. We drop them here on the basis that the schema's keySteps array is
      // the canonical content of § 06; if the author wants the intro preserved, it should
      // live in § 05 Approach instead.
    }
  }
  flushStep();

  if (steps.length < 2) {
    throw new Error(
      `Procedure keySteps requires at least 2 steps (got ${steps.length}). Check § 06 structure for "### Step N — Title" markers.`,
    );
  }

  return steps;
}

function buildProcedureDoc(fm: ProcedureFrontmatter, items: ContentItem[]): SanityDoc {
  // Split items by h2 boundaries. Within each, route to the matching schema field.
  const sectionBuckets: Record<string, ContentItem[]> = {};
  let currentField: string | null = null;
  let currentBuf: ContentItem[] = [];

  const flushBucket = () => {
    if (currentField) {
      sectionBuckets[currentField] = (sectionBuckets[currentField] || []).concat(currentBuf);
    }
    currentBuf = [];
  };

  // Special tracking: we also want to extract Key Points box and Patient Summary.
  let inKeyPointsBox = false;
  let inPatientSummary = false;
  const keyPointsBuf: ContentItem[] = [];
  const patientSummaryBuf: ContentItem[] = [];

  // Also: skip "Summary (one-line)" body section since we moved its content
  // into frontmatter.summary.
  let inSummary = false;

  for (const it of items) {
    if (it._type === 'block' && (it as Block).style === 'h2') {
      flushBucket();
      currentField = null;
      const headingText = ((it as Block).children[0]?.text || '').trim();
      inKeyPointsBox = false;
      inPatientSummary = false;
      inSummary = false;

      // "Summary (one-line)" — skip the body section
      if (/^Summary/i.test(headingText)) {
        inSummary = true;
        continue;
      }
      // "Key Points box (JAMA-style)" or "Key Points"
      if (/^Key Points/i.test(headingText)) {
        inKeyPointsBox = true;
        continue;
      }
      // "Patient summary (collapsible..."
      if (/^Patient summary/i.test(headingText)) {
        inPatientSummary = true;
        continue;
      }

      // "§ NN — SectionName"
      const m = headingText.match(/^§\s*(\d{2})\s*[—-]/);
      if (m) {
        const field = PROCEDURE_SECTION_FIELD_MAP[m[1]];
        if (!field) {
          throw new Error(`Unknown procedure section number: § ${m[1]} ("${headingText}")`);
        }
        currentField = field;
        continue;
      }

      // Any other h2 — emit verbatim (rare; e.g. "Note" sections).
      // Map to the closest preceding field (or a synthetic 'misc' bucket).
      currentBuf.push(it);
      continue;
    }

    if (inKeyPointsBox) {
      keyPointsBuf.push(it);
    } else if (inPatientSummary) {
      patientSummaryBuf.push(it);
    } else if (inSummary) {
      // Drop — content already in frontmatter.summary
    } else if (currentField) {
      currentBuf.push(it);
    }
    // Items before the first h2 (between frontmatter and first heading) are dropped.
  }
  flushBucket();

  // Build keyPoints from keyPointsBuf.
  let keyPoints: ParsedKeyPointsBlock | null = null;
  if (keyPointsBuf.length > 0) {
    const flatTexts = keyPointsBuf
      .filter((it) => it._type === 'block')
      .map((b) => (b as Block).children.map((c) => c.text).join('').trim())
      .filter((s) => s.length > 0);
    const kp: ParsedKeyPointsBlock = {};
    for (const text of flatTexts) {
      const mq = text.match(/^Question[.:]\s*(.+)$/i);
      if (mq) kp.question = mq[1].trim();
      const mf = text.match(/^Findings[.:]\s*(.+)$/i);
      if (mf) kp.findings = mf[1].trim();
      const mm = text.match(/^Meaning[.:]\s*(.+)$/i);
      if (mm) kp.meaning = mm[1].trim();
    }
    if (kp.question || kp.findings || kp.meaning) keyPoints = kp;
  }

  const doc: SanityDoc = {
    _id: `procedure-${fm.slug}`,
    _type: 'procedurePage',
    title: fm.title,
    slug: { _type: 'slug', current: fm.slug },
    category: fm.category,
    language: fm.language ?? 'en',
    audience: fm.audience,
    lastUpdated: fm.last_clinically_reviewed,
    summary: fm.summary,
  };

  if (keyPoints) doc.keyPoints = keyPoints;

  // Schema-required sections. Validate presence.
  const requiredFields = ['indications', 'anatomy', 'approach', 'aftercare', 'complications', 'evidence'];
  for (const f of requiredFields) {
    if (!sectionBuckets[f] || sectionBuckets[f].length === 0) {
      throw new Error(`Procedure ${fm.slug} missing required section: ${f}`);
    }
  }

  // Map section buckets to schema fields.
  const blockArrayFields = [
    'indications',
    'contraindications',
    'anatomy',
    'positioning',
    'approach',
    'closure',
    'aftercare',
    'complications',
    'evidence',
  ];
  for (const f of blockArrayFields) {
    if (sectionBuckets[f]) doc[f] = sectionBuckets[f];
  }

  // keySteps — special parser
  if (sectionBuckets.keySteps) {
    doc.keySteps = buildProcedureKeySteps(sectionBuckets.keySteps);
  } else {
    throw new Error(`Procedure ${fm.slug} missing § 06 Key Steps`);
  }

  // patientSummary
  if (patientSummaryBuf.length > 0) {
    doc.patientSummary = blocksOnly(patientSummaryBuf);
  }

  // SEO + hero
  if (fm.seo_title) doc.seoTitle = fm.seo_title.length > 60 ? fm.seo_title.slice(0, 60) : fm.seo_title;
  if (fm.seo_description)
    doc.seoDescription =
      fm.seo_description.length > 160 ? fm.seo_description.slice(0, 160) : fm.seo_description;

  return doc;
}

// ============================================================================
// Cross-links patcher
// ============================================================================

interface CrossLinksFile {
  pieces: Array<{
    piece_id: string;
    type: 'article' | 'procedure';
    relatedArticles?: Array<{ slug: string; displayContext?: string; linkCopy?: string }>;
    relatedProcedures?: Array<{ slug: string; displayContext?: string; linkCopy?: string }>;
  }>;
}

function loadCrossLinks(): CrossLinksFile {
  return JSON.parse(
    readFileSync(resolve(PACKAGE_DIR, 'cross-links.json'), 'utf8'),
  ) as CrossLinksFile;
}

// ============================================================================
// Sanity I/O helpers
// ============================================================================

async function existingDocIds(ids: string[]): Promise<Set<string>> {
  if (!client || ids.length === 0) return new Set();
  const found = await client.fetch<string[]>('*[_id in $ids]._id', { ids });
  return new Set(found);
}

// Slug-fallback for legacy UUID-form glossary docs (Phase-5).
async function resolveGlossarySlug(slug: string): Promise<string | null> {
  if (!client) return null;
  const id = await client.fetch<string | null>(
    `*[_type == "glossaryTerm" && slug.current == $slug][0]._id`,
    { slug },
  );
  return id;
}

async function resolveBibSlug(slug: string): Promise<string | null> {
  if (!client) return null;
  const id = await client.fetch<string | null>(
    `*[_type == "bibReference" && _id == $id][0]._id`,
    { id: slug },
  );
  return id;
}

async function buildGlossarySlugToIdMap(
  packageDocs: SanityDoc[],
): Promise<Map<string, string>> {
  // For each package glossary doc, the resolved live ID is either:
  //   - `glossary-{slug}` (will-be-seeded or already-seeded with slug-form _id)
  //   - or a UUID for legacy slug-fallback (Phase-5 docs)
  const map = new Map<string, string>();
  for (const doc of packageDocs) {
    const slug = (doc.slug as { current: string }).current;
    const desiredId = doc._id;
    if (dryRun) {
      map.set(slug, desiredId);
      continue;
    }
    const liveId = await resolveGlossarySlug(slug);
    map.set(slug, liveId ?? desiredId);
  }
  return map;
}

async function buildBibSlugToIdMap(
  packageDocs: SanityDoc[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = packageDocs.map((d) => d._id);
  const existing = dryRun ? new Set<string>() : await existingDocIds(ids);
  for (const id of ids) {
    map.set(id, existing.has(id) ? id : id); // package _id is slug-form; same either way
  }
  return map;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`Dupuytren EN package seed${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`Source: ${PACKAGE_DIR}`);

  // -------- Stage 0: load + normalise --------
  console.log('\n→ Loading + normalising package files…');
  const glossaryDocs = loadGlossary();
  const bibliographyDocs = loadBibliography();
  console.log(`  Loaded ${bibliographyDocs.length} references and ${glossaryDocs.length} glossary terms`);

  // Pre-resolve slug→liveId maps so the body parser can emit refs that point at
  // the actual live docs (handles legacy UUID-form glossary docs).
  const glossarySlugToId = await buildGlossarySlugToIdMap(glossaryDocs);
  const bibSlugToId = await buildBibSlugToIdMap(bibliographyDocs);

  // -------- Stage 1: parse + build content docs --------
  console.log('\n→ Parsing content pieces…');
  const contentDocs: { slug: string; type: 'article' | 'procedurePage'; doc: SanityDoc }[] = [];

  const PIECE_FILES = [
    { file: 'dupuytrens-disease-patient-guide.md', type: 'article' as const },
    { file: 'dupuytrens-disease-fessh-prep.md', type: 'article' as const },
    { file: 'percutaneous-needle-fasciotomy.md', type: 'procedurePage' as const },
    { file: 'limited-fasciectomy.md', type: 'procedurePage' as const },
  ];

  for (const piece of PIECE_FILES) {
    resetKeys();
    const md = readFileSync(resolve(PACKAGE_DIR, piece.file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(md);
    const bodyMinusRefs = stripInlineReferencesSection(body);
    const { bodyWithoutTable, mapping } = extractCitationMappingTable(bodyMinusRefs);
    const stripped = stripBodyTitle(bodyWithoutTable);

    const ctx: ResolveCtx = {
      glossarySlugToId,
      bibSlugToId,
      citationMap: mapping,
      pieceLabel: piece.file,
    };

    const items = buildContent(stripped, ctx);

    let doc: SanityDoc;
    if (piece.type === 'article') {
      doc = buildArticleDoc(frontmatter as unknown as ArticleFrontmatter, items);
    } else {
      doc = buildProcedureDoc(frontmatter as unknown as ProcedureFrontmatter, items);
    }

    const citationMarks = items.flatMap((it) => {
      if (it._type === 'block') return (it as Block).markDefs.filter((m) => m._type === 'citation');
      if (it._type === 'callout') {
        return (it as Callout).content.flatMap((b) => b.markDefs.filter((m) => m._type === 'citation'));
      }
      return [];
    }).length;
    const glossaryMarks = items.flatMap((it) => {
      if (it._type === 'block') return (it as Block).markDefs.filter((m) => m._type === 'glossaryTerm');
      if (it._type === 'callout') {
        return (it as Callout).content.flatMap((b) =>
          b.markDefs.filter((m) => m._type === 'glossaryTerm'),
        );
      }
      return [];
    }).length;

    const slug = (frontmatter as { slug: string }).slug;
    contentDocs.push({ slug, type: piece.type, doc });
    console.log(
      `  ${piece.file}: ${items.length} blocks/callouts, ${citationMarks} citations, ${glossaryMarks} glossary marks`,
    );
  }

  // -------- Dry-run summary --------
  if (dryRun) {
    console.log('\n=== DRY RUN SUMMARY ===');
    console.log(`Glossary terms : ${glossaryDocs.length}`);
    console.log(`Bibliography  : ${bibliographyDocs.length}`);
    console.log(`Content pieces: ${contentDocs.length}`);
    for (const c of contentDocs) {
      console.log(`  ${c.doc._id} (${c.type})`);
    }
    console.log('\n✓ Dry-run complete. No writes performed.');
    return;
  }

  // -------- Stage 2: seed glossary --------
  console.log(`\n→ Stage 1/4: Seeding ${glossaryDocs.length} glossaryTerm documents…`);
  for (const doc of glossaryDocs) {
    // If a legacy doc exists with the same slug but a different _id (UUID form),
    // overwrite the live UUID-id doc rather than creating a slug-form duplicate.
    const slug = (doc.slug as { current: string }).current;
    const liveId = glossarySlugToId.get(slug);
    const writeDoc = liveId && liveId !== doc._id ? { ...doc, _id: liveId } : doc;
    try {
      await client!.createOrReplace(writeDoc);
      process.stdout.write('.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ ${writeDoc._id} — ${message}`);
      throw err;
    }
  }
  console.log(`\n  ✓ ${glossaryDocs.length} glossary docs seeded`);

  // -------- Stage 3: seed bibliography --------
  console.log(`\n→ Stage 2/4: Seeding ${bibliographyDocs.length} bibReference documents…`);
  for (const doc of bibliographyDocs) {
    try {
      await client!.createOrReplace(doc);
      process.stdout.write('.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ ${doc._id} — ${message}`);
      throw err;
    }
  }
  console.log(`\n  ✓ ${bibliographyDocs.length} bibReference docs seeded`);

  // -------- Stage 4: seed content docs --------
  console.log(`\n→ Stage 3/4: Seeding ${contentDocs.length} content documents…`);
  for (const c of contentDocs) {
    try {
      await client!.createOrReplace(c.doc);
      console.log(`  ✓ ${c.doc._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${c.doc._id} — ${message}`);
      throw err;
    }
  }

  // -------- Stage 5: cross-links patch --------
  if (noPatch) {
    console.log('\n→ Stage 4/4: SKIPPED (--no-cross-links)');
  } else {
    console.log('\n→ Stage 4/4: Applying cross-link patches…');
    const xLinks = loadCrossLinks();
    for (const piece of xLinks.pieces) {
      const docId =
        piece.type === 'article'
          ? `article-${piece.piece_id}`
          : `procedure-${piece.piece_id}`;
      const relatedArticles = (piece.relatedArticles ?? []).map((r, i) => ({
        _key: `ra-${i}`,
        _type: 'reference',
        _ref: `article-${r.slug}`,
      }));
      const relatedProcedures = (piece.relatedProcedures ?? []).map((r, i) => ({
        _key: `rp-${i}`,
        _type: 'reference',
        _ref: `procedure-${r.slug}`,
      }));
      try {
        await client!
          .patch(docId)
          .set({
            ...(relatedArticles.length > 0 ? { relatedArticles } : {}),
            ...(relatedProcedures.length > 0 ? { relatedProcedures } : {}),
          })
          .commit();
        console.log(
          `  ✓ ${docId} (${relatedArticles.length} related articles, ${relatedProcedures.length} related procedures)`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${docId} cross-links — ${message}`);
        throw err;
      }
    }
  }

  console.log('\n✓ Seed complete.');
  console.log('\nNext steps:');
  console.log('  1. Trigger a Vercel rebuild on the site project (push or dashboard).');
  console.log('  2. Smoke-test the four pages at:');
  console.log('     - /en/blog/dupuytrens-disease-patient-guide/');
  console.log('     - /en/blog/dupuytrens-disease-fessh-prep/');
  console.log('     - /en/procedures/percutaneous-needle-fasciotomy/');
  console.log('     - /en/procedures/limited-fasciectomy/');
  console.log(
    `  3. Revoke the write token at https://www.sanity.io/manage/project/${PROJECT_ID}/api → Tokens.`,
  );
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n✗ Seed failed:', message);
  process.exit(1);
});
