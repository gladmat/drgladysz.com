// site/scripts/seed-dupuytren-pl-package.ts
//
// Seeder for the Polish Dupuytren content package at
// 01-brand-system/inbox/Dupuytren PL/.
//
// Ingests:
//   - 1 patient article  ("choroba-dupuytrena", category: patient,  audience: patient)
//   - 1 expert article   ("choroba-dupuytrena-leczenie-operacyjne", category: expert, audience: peer)
//   - 1 PNF procedure   ("aponeurotomia-iglowa-przezskorna", category: hand-surgery)
//   - 1 LF procedure    ("fasciektomia-ograniczona", category: hand-surgery)
//
// Glossary strategy (Path A):
//   The 16 PL glossary entries map by English `term` field to existing EN
//   glossary docs (single-doc-bilingual convention). The seed PATCHES
//   existing docs, adding `termPolish`, `shortDefinitionPolish`, and
//   extending `synonyms`/`relatedTerms`. New docs (Dupuytren's nodule, PROM)
//   are created with PL-rooted slugs only when no EN equivalent exists.
//
// Bibliography strategy (Path A):
//   For each PL reference, the seed first tries `_id == slug` lookup. If
//   missing, falls back to (firstAuthor surname, year, title-prefix) match
//   against the live dataset; reuses the existing doc if found (recovering
//   the existing PMID/DOI/PMCID). New docs only when no match exists.
//
// Conflicting metadata (top-level 03-*-metadata.yaml vs body frontmatter):
//   The body frontmatter is canonical. Top-level YAMLs are ignored — early-
//   draft artefacts.
//
// PL DSL:
//   [gloss:DISPLAYED_POLISH|TOOLTIP_TEXT]   — inline glossary mark; resolved
//                                            via termPolish-match
//   [N]   or [N,M]                          — citation marks; resolved via
//                                            per-piece citationKey → slug map
//   **bold**                                — strong
//   *italic*                                — em
//   [text](url)                             — markdown link
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   # Dry-run:
//   node --experimental-strip-types scripts/seed-dupuytren-pl-package.ts --dry-run
//   # Live:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/seed-dupuytren-pl-package.ts

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// ============================================================================
// Config
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_DIR = resolve(__dirname, '../../01-brand-system/inbox/Dupuytren PL');
const FASCIEKTOMIA_REFS_PATH = resolve(
  PACKAGE_DIR,
  'mnt/user-data/outputs/sanity-import-pakiet-dupuytrena/procedures/fasciektomia-ograniczona/04-references.yaml',
);
const AUTHOR_ID = '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472';

const dryRun = process.argv.includes('--dry-run');
const verboseAudit = process.argv.includes('--verbose-audit');

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

const client = createClient({
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

interface RefYaml {
  slug: string;
  citationKey: number;
  referenceType: string;
  authors: string[];
  title: string;
  journal?: string;
  journalAbbreviation?: string;
  publisher?: string;
  bookTitle?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  url?: string;
  notesForMateusz?: string;
}

interface GlossYaml {
  slug: string;
  term: string;
  termPolish: string;
  category: string;
  synonyms?: string[];
  shortDefinition: string;
  shortDefinitionPolish: string;
  relatedTerms?: string[];
}

// ============================================================================
// Remaps
// ============================================================================

const GLOSSARY_CATEGORY_REMAP: Record<string, string> = {
  anatomy: 'anatomy',
  condition: 'condition',
  procedure: 'procedure',
  investigation: 'investigation',
  treatment: 'treatment',
  outcome: 'outcome',
  structure: 'structure',
  other: 'other',
  'outcome-measure': 'outcome',
  pharmacology: 'treatment',
  symptom: 'condition',
  classification: 'other',
};

const PUBTYPE_REMAP: Record<string, string> = {
  journalArticle: 'journal',
  bookChapter: 'chapter',
  guideline: 'guideline',
  conferencePaper: 'conference',
  online: 'online',
  preprint: 'online',
  journal: 'journal',
  book: 'book',
  chapter: 'chapter',
  conference: 'conference',
};

const PROCEDURE_SECTION_FIELD_MAP: Record<string, string> = {
  '01': 'indications',
  '02': 'contraindications',
  '03': 'anatomy',
  '04': 'positioning',
  '05': 'approach',
  '06': 'keySteps',
  '07': 'closure',
  '08': 'aftercare',
  '09': 'complications',
  '10': 'evidence',
};

// ============================================================================
// Key counters
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
// Frontmatter + body splitter
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
  if (endIdx < 0) throw new Error('Unterminated frontmatter (no closing `---`)');
  const frontmatterRaw = lines.slice(1, endIdx).join('\n');
  const body = lines.slice(endIdx + 1).join('\n');
  return {
    frontmatter: yaml.load(frontmatterRaw) as Record<string, unknown>,
    body,
  };
}

function stripAuthoringNotes(body: string): string {
  const sentinel = /^##\s+Notatki autoryjne/m;
  const m = body.match(sentinel);
  if (!m) return body;
  const idx = body.indexOf(m[0]);
  return body.slice(0, idx).trimEnd();
}

function stripInlineBibliographySection(body: string): string {
  // The PL expert article body has an inline `## Piśmiennictwo` Vancouver
  // list — the same content the [slug].astro template will render as a
  // `<Bibliography>` from the citation marks. The procedure-page parser
  // already skips this section via the `inPismienn` flag in
  // `buildProcedureDoc`, but the article path didn't strip it. Result was
  // bibliography rendered twice on the live page; caught by audit
  // 2026-05-05.
  const marker = /^##\s+Piśmiennictwo\s*$/m;
  const m = body.match(marker);
  if (!m) return body;
  const idx = body.indexOf(m[0]);
  return body.slice(0, idx).trimEnd();
}

// ============================================================================
// Inline tokeniser (PL DSL)
// ============================================================================

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'em'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'cite'; positions: number[] }
  | { type: 'gloss'; displayed: string; tooltip: string }
  | { type: 'link'; text: string; href: string };

const TOKEN_PATTERNS: Array<{
  regex: RegExp;
  build: (m: RegExpMatchArray) => InlineToken;
}> = [
  { regex: /^\*\*([^*\n]+)\*\*/, build: (m) => ({ type: 'strong', value: m[1] }) },
  { regex: /^\*([^*\n]+)\*/, build: (m) => ({ type: 'em', value: m[1] }) },
  {
    regex: /^\[gloss:([^|\]]+)\|([^\]]+)\]/,
    build: (m) => ({ type: 'gloss', displayed: m[1].trim(), tooltip: m[2].trim() }),
  },
  {
    regex: /^\[(\d+(?:\s*,\s*\d+)*)\]/,
    build: (m) => ({
      type: 'cite',
      positions: m[1].split(',').map((s) => Number(s.trim())),
    }),
  },
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

interface ResolveCtx {
  glossaryTermPolishToId: Map<string, string>;
  citationPositionToBibId: Map<number, string>;
  pieceLabel: string;
  unmatchedGloss: Set<string>;
}

// Hand-tuned aliases for body markers whose displayed text doesn't match a
// `termPolish` in the glossary YAML. Maps to a live Sanity glossary _id —
// either an existing EN doc (single-doc-bilingual convention) or a doc that
// the seed will create from the PL glossary YAML.
const HAND_TUNED_PL_DISPLAY_TO_LIVEID: Record<string, string> = {
  // Body uses "guzek (DD)"; YAML termPolish is "guzek (choroby Dupuytrena)".
  // The PL glossary YAML has slug `guzek-dd` — seed creates `glossary-guzek-dd`.
  'guzek (DD)': 'glossary-guzek-dd',
  // Body uses "całkowity bierny deficyt wyprostu"; not in PL glossary YAML.
  // Maps to existing EN doc with slug `tped`.
  'całkowity bierny deficyt wyprostu': 'glossary-tped',
  // Body uses short form "zespół wieloobjawowego bólu miejscowego"; YAML
  // termPolish has "(CRPS)" suffix. Strip-parens fallback also handles it.
  'zespół wieloobjawowego bólu miejscowego': 'glossary-complex-regional-pain-syndrome',
};

function tokensToBlock(
  tokens: InlineToken[],
  ctx: ResolveCtx,
): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];
  let pendingText = '';

  const flushText = () => {
    if (pendingText) {
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: pendingText,
        marks: [],
      });
      pendingText = '';
    }
  };

  for (const tok of tokens) {
    if (tok.type === 'text') {
      pendingText += tok.value;
    } else if (tok.type === 'em') {
      flushText();
      children.push({ _type: 'span', _key: nextSpanKey(), text: tok.value, marks: ['em'] });
    } else if (tok.type === 'strong') {
      flushText();
      children.push({ _type: 'span', _key: nextSpanKey(), text: tok.value, marks: ['strong'] });
    } else if (tok.type === 'link') {
      flushText();
      const markKey = nextMarkKey('l');
      markDefs.push({ _type: 'link', _key: markKey, href: tok.href });
      children.push({ _type: 'span', _key: nextSpanKey(), text: tok.text, marks: [markKey] });
    } else if (tok.type === 'gloss') {
      // Resolution strategies in order:
      //   1. Exact termPolish match in glossary YAML
      //   2. Strip-parens-suffix fallback (e.g. body "X" matches YAML "X (Y)")
      //   3. Hand-tuned alias map
      //   4. Plain-text with warning (graceful degradation)
      let liveId = ctx.glossaryTermPolishToId.get(tok.displayed);
      if (!liveId) {
        // Try matching against any termPolish where the YAML form is
        // "displayed (parens-content)" by checking the displayed against each
        // entry's stripped-parens form.
        for (const [k, v] of ctx.glossaryTermPolishToId.entries()) {
          const stripped = k.replace(/\s*\([^)]*\)\s*$/, '').trim();
          if (stripped === tok.displayed) {
            liveId = v;
            break;
          }
        }
      }
      if (!liveId) liveId = HAND_TUNED_PL_DISPLAY_TO_LIVEID[tok.displayed];
      if (!liveId) {
        // Graceful degradation: render as plain text, record for warning.
        ctx.unmatchedGloss.add(tok.displayed);
        flushText();
        children.push({
          _type: 'span',
          _key: nextSpanKey(),
          text: tok.displayed,
          marks: [],
        });
        continue;
      }
      flushText();
      const markKey = nextMarkKey('g');
      markDefs.push({
        _type: 'glossaryTerm',
        _key: markKey,
        term: { _type: 'reference', _ref: liveId },
      });
      children.push({ _type: 'span', _key: nextSpanKey(), text: tok.displayed, marks: [markKey] });
    } else if (tok.type === 'cite') {
      const markKeys: string[] = [];
      for (const position of tok.positions) {
        const bibId = ctx.citationPositionToBibId.get(position);
        if (!bibId) {
          throw new Error(
            `Citation [${position}] in ${ctx.pieceLabel} — position not in references YAML`,
          );
        }
        const markKey = nextMarkKey('c');
        markDefs.push({
          _type: 'citation',
          _key: markKey,
          reference: { _type: 'reference', _ref: bibId },
        });
        markKeys.push(markKey);
      }
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

// ============================================================================
// Body builder
// ============================================================================

function buildContent(bodyMd: string, ctx: ResolveCtx): ContentItem[] {
  const lines = bodyMd.split('\n');
  const items: ContentItem[] = [];
  let paraBuf: string[] = [];
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
    const pitfallMatch =
      text.match(/^\*\*Pułapka\s*(?:kliniczna|chirurgiczna|techniczna)?\*\*[.\s]*\s*(.*)$/i) ||
      text.match(/^\*\*Pitfall\s*—\s*([^*]+?)\.?\*\*\s*(.*)$/i);
    let calloutType: 'pearl' | 'info' = 'info';
    let title: string | undefined;
    let calloutText = text;
    if (pitfallMatch) {
      calloutType = 'pearl';
      if (pitfallMatch.length === 3 && pitfallMatch[1] && pitfallMatch[2]) {
        title = pitfallMatch[1].trim();
        calloutText = pitfallMatch[2].trim();
      } else {
        title = 'Pułapka kliniczna';
        calloutText = pitfallMatch[1].trim();
      }
    }
    const { children, markDefs } = tokensToBlock(tokenizeInline(calloutText), ctx);
    const inner: Block = {
      _type: 'block',
      _key: nextBlockKey(),
      style: 'normal',
      markDefs,
      children,
    };
    items.push({
      _type: 'callout',
      _key: nextCalloutKey(),
      type: calloutType,
      ...(title ? { title } : {}),
      content: [inner],
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim() === '') {
      flushPara();
      flushQuote();
      continue;
    }
    if (line.trim() === '---') {
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
    flushQuote();
    paraBuf.push(line);
  }
  flushPara();
  flushQuote();

  return items;
}

// ============================================================================
// Aponeurotomia inline `## Piśmiennictwo` parser
// ============================================================================

function parseInlineBibliographySection(body: string): RefYaml[] {
  const sectionMatch = body.match(/##\s+Piśmiennictwo\s*\n([\s\S]*?)(?=\n##\s+|$)/);
  if (!sectionMatch) return [];
  const section = sectionMatch[1];

  const refs: RefYaml[] = [];
  const itemRegex = /^(\d+)\.\s+([\s\S]+?)(?=\n\d+\.\s+|$)/gm;
  for (const m of section.matchAll(itemRegex)) {
    const num = Number(m[1]);
    const raw = m[2].trim().replace(/\s+/g, ' ');
    const ref = parseVancouverEntry(num, raw);
    if (ref) refs.push(ref);
  }
  return refs;
}

function parseVancouverEntry(citationKey: number, raw: string): RefYaml | null {
  const text = raw.replace(/\s+/g, ' ').replace(/\.\s*$/, '');
  // Split on ". " before a capital letter, opening quote, OR an italic-marker
  // asterisk (`*Journal Name*` is the Vancouver convention used in the
  // aponeurotomia inline bibliography). Without `*` in the lookahead the title
  // and journal would not be split apart, baking the journal/year into the
  // title field — caught by the post-seed audit on 2026-05-05.
  const parts = text.split(/\.\s+(?=[A-ZŁŚŻŹĆĄĘĆ"„*])/u);
  if (parts.length < 2) return null;
  const authorsRaw = parts[0];
  const authors = authorsRaw
    .split(/,\s*/)
    .map((s) => s.replace(/^i\s+wsp\.?$/, 'et al.').trim())
    .filter(Boolean);
  const title = parts[1].replace(/[.\s]+$/, '').replace(/^"+|"+$/g, '');
  let journal: string | undefined;
  const journalMatch = parts.slice(2).join('. ').match(/\*([^*]+)\*/);
  if (journalMatch) journal = journalMatch[1].trim();
  const yearMatch = text.match(/(\b(?:19|20)\d{2}\b)/);
  const year = yearMatch ? Number(yearMatch[1]) : 0;
  const vipMatch =
    text.match(/(\d+)\s*[(](\d+)[)]\s*:\s*(\S+)/) ||
    text.match(/(\d+)\s*;\s*(\d+):\s*(\S+)/);
  let volume: string | undefined;
  let issue: string | undefined;
  let pages: string | undefined;
  if (vipMatch) {
    volume = vipMatch[1];
    issue = vipMatch[2];
    pages = vipMatch[3].replace(/[.,;].*$/, '');
  }
  const slug = synthSlugFromAuthorYear(authors[0] || 'unknown', year, title);
  const isGuideline =
    /Society|Guideline|Best treatment|Praktyka|Wytyczne|Statement/i.test(authorsRaw + ' ' + title);
  const referenceType = isGuideline ? 'guideline' : 'journalArticle';
  return {
    slug,
    citationKey,
    referenceType,
    authors,
    title,
    journal,
    year,
    ...(volume ? { volume } : {}),
    ...(issue ? { issue } : {}),
    ...(pages ? { pages } : {}),
  };
}

function synthSlugFromAuthorYear(firstAuthor: string, year: number, title: string): string {
  const surnameRaw = firstAuthor.split(/\s+/)[0].toLowerCase();
  const surname = surnameRaw
    .replace(/'/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const hint = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['the', 'and', 'with', 'for', 'into', 'from', 'after'].includes(w))
    .slice(0, 1)
    .join('-');
  return [surname, year || 'na', hint].filter(Boolean).join('-');
}

// ============================================================================
// References YAML loader + bib doc builder
// ============================================================================

function loadReferencesYaml(path: string): RefYaml[] {
  const raw = readFileSync(path, 'utf8');
  const doc = yaml.load(raw) as { references: RefYaml[] };
  if (!doc?.references) throw new Error(`No 'references' key in ${path}`);
  return doc.references;
}

function buildBibDoc(ref: RefYaml): SanityDoc {
  const remappedPubType = PUBTYPE_REMAP[ref.referenceType];
  if (!remappedPubType) {
    throw new Error(`Unknown referenceType: ${ref.referenceType} (slug ${ref.slug})`);
  }
  let journalSource: string | undefined;
  if (remappedPubType === 'journal') {
    journalSource = ref.journalAbbreviation ?? ref.journal;
  } else if (remappedPubType === 'guideline') {
    journalSource = ref.publisher ?? ref.journal ?? 'Guideline';
  } else if (remappedPubType === 'chapter' || remappedPubType === 'book') {
    journalSource = ref.bookTitle ?? ref.journal;
  } else {
    journalSource = ref.journal ?? ref.publisher;
  }
  if (!journalSource) journalSource = 'Source not specified';
  return {
    _id: ref.slug,
    _type: 'bibReference',
    title: ref.title,
    authors: ref.authors,
    journal: journalSource,
    year: ref.year,
    pubType: remappedPubType,
    ...(ref.volume ? { volume: ref.volume } : {}),
    ...(ref.issue ? { issue: ref.issue } : {}),
    ...(ref.pages ? { pages: ref.pages } : {}),
    ...(ref.pmid ? { pmid: ref.pmid } : {}),
    ...(ref.pmcid ? { pmcid: ref.pmcid } : {}),
    ...(ref.doi ? { doi: ref.doi } : {}),
    ...(ref.url ? { url: ref.url } : {}),
  };
}

// ============================================================================
// Audits
// ============================================================================

interface BibMatch {
  packageRef: RefYaml;
  liveId: string;
  status: 'slug-exact' | 'fingerprint-match' | 'new';
  existingPmid?: string;
  existingDoi?: string;
}

async function auditBibliography(refs: RefYaml[]): Promise<Map<string, BibMatch>> {
  const result = new Map<string, BibMatch>();
  const refsBySlug = new Map<string, RefYaml>();
  for (const r of refs) {
    if (!refsBySlug.has(r.slug)) refsBySlug.set(r.slug, r);
  }
  const ids = Array.from(refsBySlug.keys());
  const existingBySlug = await client.fetch<
    { _id: string; pmid?: string; doi?: string }[]
  >('*[_id in $ids]{_id, pmid, doi}', { ids });
  const slugMatchSet = new Set(existingBySlug.map((d) => d._id));
  for (const d of existingBySlug) {
    const r = refsBySlug.get(d._id);
    if (!r) continue;
    result.set(r.slug, {
      packageRef: r,
      liveId: d._id,
      status: 'slug-exact',
      existingPmid: d.pmid,
      existingDoi: d.doi,
    });
  }
  const unmatched = Array.from(refsBySlug.values()).filter((r) => !slugMatchSet.has(r.slug));
  for (const r of unmatched) {
    if (result.has(r.slug)) continue;
    const firstAuthor = r.authors[0] || '';
    if (!firstAuthor) {
      result.set(r.slug, { packageRef: r, liveId: r.slug, status: 'new' });
      continue;
    }
    const surname = firstAuthor.replace(/\s+\w+$/, '').trim() || firstAuthor;
    const titlePrefix = r.title.slice(0, 40).toLowerCase();
    const match = await client.fetch<
      { _id: string; pmid?: string; doi?: string; title: string } | null
    >(
      '*[_type == "bibReference" && authors[0] match $authorPrefix && year == $year && lower(title) match $titlePrefix][0]{_id, pmid, doi, title}',
      {
        authorPrefix: `${surname}*`,
        year: r.year,
        titlePrefix: `${titlePrefix}*`,
      },
    );
    if (match) {
      result.set(r.slug, {
        packageRef: r,
        liveId: match._id,
        status: 'fingerprint-match',
        existingPmid: match.pmid,
        existingDoi: match.doi,
      });
    } else {
      result.set(r.slug, { packageRef: r, liveId: r.slug, status: 'new' });
    }
  }
  return result;
}

interface GlossMatch {
  packageEntry: GlossYaml;
  liveId: string;
  status: 'matched-by-term' | 'matched-by-slug' | 'new';
}

async function auditGlossary(entries: GlossYaml[]): Promise<Map<string, GlossMatch>> {
  const result = new Map<string, GlossMatch>();
  const enTerms = entries.map((e) => e.term);
  const slugIds = entries.map((e) => `glossary-${e.slug}`);
  const byTerm = await client.fetch<{ _id: string; term: string }[]>(
    '*[_type == "glossaryTerm" && term in $terms]{_id, term}',
    { terms: enTerms },
  );
  const termToId = new Map<string, string>();
  for (const d of byTerm) termToId.set(d.term, d._id);
  const bySlug = await client.fetch<{ _id: string }[]>(
    '*[_type == "glossaryTerm" && _id in $ids]{_id}',
    { ids: slugIds },
  );
  const slugSet = new Set(bySlug.map((d) => d._id));
  // Hand-tuned aliases for terms that don't exact-match by `term` field.
  const TERM_ALIAS: Record<string, string> = {
    'neurovascular bundle': 'glossary-digital-neurovascular-bundle',
    'percutaneous needle aponeurotomy': 'glossary-percutaneous-needle-fasciotomy',
    'Hueston diathesis': 'glossary-diathesis',
    'Garrod knuckle pads': 'glossary-garrods-pads',
    'WALANT (wide awake local anaesthesia no tourniquet)': 'glossary-walant',
    'complex regional pain syndrome (CRPS)': 'glossary-complex-regional-pain-syndrome',
    'Ledderhose disease (plantar fibromatosis)': 'glossary-ledderhose-disease',
  };
  for (const e of entries) {
    const aliasId = TERM_ALIAS[e.term];
    if (aliasId) {
      result.set(e.slug, { packageEntry: e, liveId: aliasId, status: 'matched-by-term' });
      continue;
    }
    const termId = termToId.get(e.term);
    if (termId) {
      result.set(e.slug, { packageEntry: e, liveId: termId, status: 'matched-by-term' });
      continue;
    }
    if (slugSet.has(`glossary-${e.slug}`)) {
      result.set(e.slug, {
        packageEntry: e,
        liveId: `glossary-${e.slug}`,
        status: 'matched-by-slug',
      });
      continue;
    }
    result.set(e.slug, { packageEntry: e, liveId: `glossary-${e.slug}`, status: 'new' });
  }
  return result;
}

// ============================================================================
// Article + procedure builders
// ============================================================================

function stripBodyTitle(body: string): string {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && lines[i].startsWith('# ')) {
    return lines.slice(i + 1).join('\n').trimStart();
  }
  return body;
}

interface ParsedKeyPoints {
  question?: string;
  findings?: string;
  meaning?: string;
}

function extractKeyPoints(items: ContentItem[]): {
  keyPoints: ParsedKeyPoints | null;
  remaining: ContentItem[];
} {
  const idx = items.findIndex(
    (it) =>
      it._type === 'block' &&
      (it as Block).style === 'h2' &&
      ((it as Block).children?.[0]?.text || '')
        .toLowerCase()
        .startsWith('wnioski kluczowe'),
  );
  if (idx < 0) return { keyPoints: null, remaining: items };
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
  const kp: ParsedKeyPoints = {};
  let pendingLabel: 'question' | 'findings' | 'meaning' | null = null;
  for (const it of within) {
    if (it._type !== 'block') continue;
    const block = it as Block;
    const flat = block.children.map((c) => c.text).join('').trim();
    if (!flat) continue;
    const mq = flat.match(/^(?:Pytanie kliniczne|Pytanie)[.:]\s*(.+)$/i);
    const mf = flat.match(/^(?:Wskazania|Ustalenia|Findings)[.:]\s*(.+)$/i);
    const mm = flat.match(/^(?:Znaczenie(?:\s+kliniczne)?|Meaning)[.:]\s*(.+)$/i);
    if (mq) {
      kp.question = mq[1].trim();
      pendingLabel = null;
      continue;
    }
    if (mf) {
      kp.findings = mf[1].trim();
      pendingLabel = null;
      continue;
    }
    if (mm) {
      kp.meaning = mm[1].trim();
      pendingLabel = null;
      continue;
    }
    if (/^Pytanie\s*kliniczne$/i.test(flat) || /^Pytanie$/i.test(flat)) {
      pendingLabel = 'question';
      continue;
    }
    if (/^(?:Wskazania|Ustalenia|Findings)$/i.test(flat)) {
      pendingLabel = 'findings';
      continue;
    }
    if (/^Znaczenie(?:\s+kliniczne)?$/i.test(flat) || /^Meaning$/i.test(flat)) {
      pendingLabel = 'meaning';
      continue;
    }
    if (pendingLabel) {
      kp[pendingLabel] = flat;
      pendingLabel = null;
    }
  }
  const hasAny = kp.question || kp.findings || kp.meaning;
  return { keyPoints: hasAny ? kp : null, remaining };
}

function buildArticleDoc(fm: Record<string, unknown>, items: ContentItem[]): SanityDoc {
  const { keyPoints, remaining } = extractKeyPoints(items);
  const slug = String(fm.slug);
  const excerpt = String(fm.excerpt || '').trim();
  const standfirst = String(fm.standfirst || excerpt).trim();
  const trimmedExcerpt =
    excerpt.length > 280 ? excerpt.slice(0, 277).trimEnd() + '…' : excerpt;
  const doc: SanityDoc = {
    _id: `article-${slug}`,
    _type: 'article',
    title: String(fm.title),
    slug: { _type: 'slug', current: slug },
    category: String(fm.category),
    language: 'pl',
    audience: String(fm.audience),
    author: { _type: 'reference', _ref: AUTHOR_ID },
    publishedDate: String(fm.publishedDate),
    lastUpdated: String(fm.lastUpdated),
    excerpt: trimmedExcerpt,
    standfirst: standfirst.length > 600 ? standfirst.slice(0, 600) : standfirst,
    body: remaining,
  };
  if (keyPoints) doc.keyPoints = keyPoints;
  if (fm.seoTitle) doc.seoTitle = String(fm.seoTitle).slice(0, 60);
  if (fm.seoDescription) doc.seoDescription = String(fm.seoDescription).slice(0, 160);
  return doc;
}

function blocksOnly(items: ContentItem[]): Block[] {
  const out: Block[] = [];
  for (const it of items) {
    if (it._type === 'block') out.push(it);
    else if (it._type === 'callout') out.push(...it.content);
  }
  return out;
}

function buildProcedureSteps(items: ContentItem[]): ProcedureStep[] {
  const steps: ProcedureStep[] = [];
  let currentStep: ProcedureStep | null = null;
  let currentBuf: ContentItem[] = [];
  const flush = () => {
    if (!currentStep) return;
    let pitfall: string | undefined;
    const description: ContentItem[] = [];
    for (const it of currentBuf) {
      if (it._type === 'callout' && it.type === 'pearl' && !pitfall) {
        const innerText = it.content
          .map((b) => (b.children || []).map((c) => c.text).join('').trim())
          .filter(Boolean)
          .join(' ');
        const titlePrefix = it.title ? `${it.title}. ` : '';
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
      /^Etap\s+\d+/i.test(((it as Block).children[0]?.text || '').trim())
    ) {
      flush();
      const titleText = (it as Block).children.map((c) => c.text).join('') || '';
      const cleaned = titleText.replace(/^Etap\s+\d+\s*[—-]\s*/, '').trim();
      currentStep = {
        _type: 'procedureStep',
        _key: nextStepKey(),
        title: cleaned,
        description: [],
      };
    } else if (currentStep) {
      currentBuf.push(it);
    }
  }
  flush();
  if (steps.length < 2) {
    throw new Error(`Procedure keySteps requires at least 2 steps (got ${steps.length})`);
  }
  return steps;
}

function buildProcedureDoc(fm: Record<string, unknown>, items: ContentItem[]): SanityDoc {
  const sectionBuckets: Record<string, ContentItem[]> = {};
  let currentField: string | null = null;
  let currentBuf: ContentItem[] = [];
  let inKeyPoints = false;
  let inPatientSummary = false;
  let inPismienn = false;
  const keyPointsBuf: ContentItem[] = [];
  const patientSummaryBuf: ContentItem[] = [];
  const flushBucket = () => {
    if (currentField) {
      sectionBuckets[currentField] = (sectionBuckets[currentField] || []).concat(currentBuf);
    }
    currentBuf = [];
  };
  for (const it of items) {
    if (it._type === 'block' && (it as Block).style === 'h2') {
      flushBucket();
      currentField = null;
      const heading = ((it as Block).children.map((c) => c.text).join('') || '').trim();
      inKeyPoints = false;
      inPatientSummary = false;
      inPismienn = false;
      if (/^Wnioski kluczowe/i.test(heading)) {
        inKeyPoints = true;
        continue;
      }
      if (/^Dla pacjenta/i.test(heading)) {
        inPatientSummary = true;
        continue;
      }
      if (/^Piśmiennictwo/i.test(heading)) {
        inPismienn = true;
        continue;
      }
      const m = heading.match(/^§\s*(\d{2})\s*[—-]/);
      if (m) {
        const field = PROCEDURE_SECTION_FIELD_MAP[m[1]];
        if (!field) throw new Error(`Unknown procedure section: § ${m[1]} ("${heading}")`);
        currentField = field;
        continue;
      }
      currentBuf.push(it);
      continue;
    }
    if (inKeyPoints) keyPointsBuf.push(it);
    else if (inPatientSummary) patientSummaryBuf.push(it);
    else if (inPismienn) {
      // skip — references sourced from YAML
    } else if (currentField) {
      currentBuf.push(it);
    }
  }
  flushBucket();

  let keyPoints: ParsedKeyPoints | null = null;
  if (keyPointsBuf.length > 0) {
    const wrapper = [
      {
        _type: 'block',
        _key: 'kp-header',
        style: 'h2',
        markDefs: [],
        children: [{ _type: 'span', _key: 'kp-h-s1', text: 'Wnioski kluczowe', marks: [] }],
      } as Block,
      ...keyPointsBuf,
    ];
    keyPoints = extractKeyPoints(wrapper).keyPoints;
  }

  const slug = String(fm.slug);
  const summary = String(fm.summary || '').trim();
  const doc: SanityDoc = {
    _id: `procedure-${slug}`,
    _type: 'procedurePage',
    title: String(fm.title),
    slug: { _type: 'slug', current: slug },
    category: String(fm.category),
    language: 'pl',
    audience: String(fm.audience),
    lastUpdated: String(fm.lastUpdated || fm.last_clinically_reviewed),
    summary: summary.length > 220 ? summary.slice(0, 220) : summary,
  };
  if (keyPoints) doc.keyPoints = keyPoints;
  for (const f of [
    'indications',
    'contraindications',
    'anatomy',
    'positioning',
    'approach',
    'closure',
    'aftercare',
    'complications',
    'evidence',
  ]) {
    if (sectionBuckets[f]) doc[f] = sectionBuckets[f];
  }
  for (const f of ['indications', 'anatomy', 'approach', 'aftercare', 'complications', 'evidence']) {
    if (!doc[f]) throw new Error(`Procedure ${slug} missing required section: ${f}`);
  }
  if (sectionBuckets.keySteps) {
    doc.keySteps = buildProcedureSteps(sectionBuckets.keySteps);
  } else {
    throw new Error(`Procedure ${slug} missing § 06 Key Steps`);
  }
  if (patientSummaryBuf.length > 0) {
    doc.patientSummary = blocksOnly(patientSummaryBuf);
  }
  if (fm.seoTitle) doc.seoTitle = String(fm.seoTitle).slice(0, 60);
  if (fm.seoDescription) doc.seoDescription = String(fm.seoDescription).slice(0, 160);
  return doc;
}

// ============================================================================
// Glossary patcher
// ============================================================================

async function patchOrCreateGlossary(
  match: GlossMatch,
  glossaryRemap: Map<string, string>,
): Promise<void> {
  const entry = match.packageEntry;
  const liveId = match.liveId;
  const relatedTerms = (entry.relatedTerms || [])
    .map((targetSlug, i) => {
      const ref = glossaryRemap.get(targetSlug);
      if (!ref) return null;
      return { _key: `rt-${i}`, _type: 'reference' as const, _ref: ref };
    })
    .filter(Boolean);

  if (match.status === 'new') {
    const doc: SanityDoc = {
      _id: liveId,
      _type: 'glossaryTerm',
      term: entry.term,
      slug: { _type: 'slug', current: entry.slug },
      category: GLOSSARY_CATEGORY_REMAP[entry.category] ?? 'other',
      shortDefinition: entry.shortDefinition,
      ...(entry.termPolish ? { termPolish: entry.termPolish } : {}),
      ...(entry.shortDefinitionPolish
        ? { shortDefinitionPolish: entry.shortDefinitionPolish }
        : {}),
      ...(entry.synonyms && entry.synonyms.length > 0 ? { synonyms: entry.synonyms } : {}),
      ...(relatedTerms.length > 0 ? { relatedTerms } : {}),
    };
    await client.createOrReplace(doc);
    return;
  }

  const setFields: Record<string, unknown> = {
    termPolish: entry.termPolish,
    shortDefinitionPolish: entry.shortDefinitionPolish,
  };
  const existing = await client.fetch<{ synonyms?: string[] } | null>(
    '*[_id == $id][0]{synonyms}',
    { id: liveId },
  );
  const existingSyn = existing?.synonyms ?? [];
  const newSyn = entry.synonyms ?? [];
  const mergedSyn = Array.from(new Set([...existingSyn, ...newSyn]));
  if (mergedSyn.length > 0) setFields.synonyms = mergedSyn;
  await client.patch(liveId).set(setFields).commit();

  if (relatedTerms.length > 0) {
    const ids = relatedTerms.map((r) => r!._ref);
    const found = await client.fetch<string[]>('*[_id in $ids]._id', { ids });
    const foundSet = new Set(found);
    const filtered = relatedTerms.filter((r) => foundSet.has(r!._ref));
    if (filtered.length > 0) {
      const existingRel = await client.fetch<{ relatedTerms?: { _ref: string }[] } | null>(
        '*[_id == $id][0]{relatedTerms}',
        { id: liveId },
      );
      const existingRefs = new Set(
        (existingRel?.relatedTerms ?? []).map((r) => r._ref),
      );
      const merged = [...(existingRel?.relatedTerms ?? [])];
      let i = merged.length;
      for (const r of filtered) {
        if (!existingRefs.has(r!._ref)) {
          merged.push({ _key: `rt-merged-${i}`, _type: 'reference', _ref: r!._ref });
          existingRefs.add(r!._ref);
          i++;
        }
      }
      await client.patch(liveId).set({ relatedTerms: merged }).commit();
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`Dupuytren PL package seed${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`Source: ${PACKAGE_DIR}`);

  console.log('\n→ Reading 4 body markdowns…');
  const PIECES = [
    {
      file: 'choroba-dupuytrena-pacjent.md',
      docType: 'article' as const,
      label: 'patient article',
    },
    {
      file: 'choroba-dupuytrena-leczenie-operacyjne.md',
      docType: 'article' as const,
      label: 'expert article',
    },
    {
      file: 'fasciektomia-ograniczona.md',
      docType: 'procedurePage' as const,
      label: 'fasciektomia procedure',
    },
    {
      file: 'aponeurotomia-iglowa-przezskorna.md',
      docType: 'procedurePage' as const,
      label: 'aponeurotomia procedure',
    },
  ];
  const parsedPieces: Array<{
    label: string;
    docType: 'article' | 'procedurePage';
    frontmatter: Record<string, unknown>;
    body: string;
  }> = [];
  for (const p of PIECES) {
    const md = readFileSync(resolve(PACKAGE_DIR, p.file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(md);
    parsedPieces.push({ label: p.label, docType: p.docType, frontmatter, body });
  }

  console.log('\n→ Loading glossary…');
  const glossYaml = yaml.load(
    readFileSync(resolve(PACKAGE_DIR, '05-glossary-terms.yaml'), 'utf8'),
  ) as { glossaryTerms: GlossYaml[] };
  const glossEntries = glossYaml.glossaryTerms;
  console.log(`  Loaded ${glossEntries.length} glossary entries`);

  console.log('\n→ Auditing glossary against existing docs…');
  const glossAudit = await auditGlossary(glossEntries);
  const glossMatchedByTerm = Array.from(glossAudit.values()).filter(
    (m) => m.status === 'matched-by-term',
  ).length;
  const glossMatchedBySlug = Array.from(glossAudit.values()).filter(
    (m) => m.status === 'matched-by-slug',
  ).length;
  const glossNew = Array.from(glossAudit.values()).filter((m) => m.status === 'new').length;
  console.log(
    `  Glossary audit: ${glossMatchedByTerm} matched-by-term, ${glossMatchedBySlug} matched-by-slug, ${glossNew} new`,
  );
  if (verboseAudit) {
    for (const m of glossAudit.values()) {
      console.log(`    ${m.status.padEnd(18)} ${m.packageEntry.slug.padEnd(35)} → ${m.liveId}`);
    }
  }

  const glossarySlugToId = new Map<string, string>();
  const glossaryTermPolishToId = new Map<string, string>();
  for (const m of glossAudit.values()) {
    glossarySlugToId.set(m.packageEntry.slug, m.liveId);
    glossaryTermPolishToId.set(m.packageEntry.termPolish, m.liveId);
  }

  console.log('\n→ Loading references YAMLs…');
  const masterRefs = loadReferencesYaml(resolve(PACKAGE_DIR, '04-references.yaml'));
  const fasciektomiaRefs = loadReferencesYaml(FASCIEKTOMIA_REFS_PATH);
  console.log(
    `  Loaded ${masterRefs.length} master refs + ${fasciektomiaRefs.length} fasciektomia refs`,
  );

  const aponeurotomiaPiece = parsedPieces.find((p) => p.label === 'aponeurotomia procedure')!;
  const aponeurotomiaRefs = parseInlineBibliographySection(aponeurotomiaPiece.body);
  console.log(`  Parsed ${aponeurotomiaRefs.length} aponeurotomia inline refs`);

  // Dedup across all sources by slug.
  const allRefsBySlug = new Map<string, RefYaml>();
  for (const r of [...masterRefs, ...fasciektomiaRefs, ...aponeurotomiaRefs]) {
    const existing = allRefsBySlug.get(r.slug);
    if (existing) {
      const score = (x: RefYaml) =>
        Object.values(x).filter((v) => v !== undefined && v !== '').length;
      if (score(r) > score(existing)) allRefsBySlug.set(r.slug, r);
    } else {
      allRefsBySlug.set(r.slug, r);
    }
  }
  const uniqueRefs = Array.from(allRefsBySlug.values());
  console.log(`  Total unique refs: ${uniqueRefs.length}`);

  console.log('\n→ Auditing bibliography against existing docs…');
  const bibAudit = await auditBibliography(uniqueRefs);
  const bibSlugExact = Array.from(bibAudit.values()).filter((m) => m.status === 'slug-exact').length;
  const bibFingerprint = Array.from(bibAudit.values()).filter(
    (m) => m.status === 'fingerprint-match',
  ).length;
  const bibNew = Array.from(bibAudit.values()).filter((m) => m.status === 'new').length;
  const bibPmidRecovered = Array.from(bibAudit.values()).filter(
    (m) => (m.status === 'slug-exact' || m.status === 'fingerprint-match') && m.existingPmid,
  ).length;
  console.log(
    `  Bibliography audit: ${bibSlugExact} slug-exact, ${bibFingerprint} fingerprint-match, ${bibNew} new`,
  );
  console.log(`  PMIDs recovered from existing docs: ${bibPmidRecovered}`);
  if (verboseAudit) {
    for (const m of bibAudit.values()) {
      const extra =
        m.status !== 'new'
          ? ` [pmid=${m.existingPmid ?? '—'}, doi=${m.existingDoi ? 'yes' : '—'}]`
          : '';
      console.log(
        `    ${m.status.padEnd(20)} ${m.packageRef.slug.padEnd(45)} → ${m.liveId}${extra}`,
      );
    }
  }

  const bibSlugToLiveId = new Map<string, string>();
  for (const m of bibAudit.values()) bibSlugToLiveId.set(m.packageRef.slug, m.liveId);

  // Per-piece citation maps
  const expertCitationMap = new Map<number, string>();
  for (const r of masterRefs) {
    const liveId = bibSlugToLiveId.get(r.slug);
    if (liveId) expertCitationMap.set(r.citationKey, liveId);
  }
  const fasciektomiaCitationMap = new Map<number, string>();
  for (const r of fasciektomiaRefs) {
    const liveId = bibSlugToLiveId.get(r.slug);
    if (liveId) fasciektomiaCitationMap.set(r.citationKey, liveId);
  }
  const aponeurotomiaCitationMap = new Map<number, string>();
  for (const r of aponeurotomiaRefs) {
    const liveId = bibSlugToLiveId.get(r.slug);
    if (liveId) aponeurotomiaCitationMap.set(r.citationKey, liveId);
  }
  const patientCitationMap = new Map<number, string>();
  const citationMaps: Record<string, Map<number, string>> = {
    'patient article': patientCitationMap,
    'expert article': expertCitationMap,
    'fasciektomia procedure': fasciektomiaCitationMap,
    'aponeurotomia procedure': aponeurotomiaCitationMap,
  };

  console.log('\n→ Parsing bodies…');
  const contentDocs: Array<{
    label: string;
    docType: 'article' | 'procedurePage';
    doc: SanityDoc;
  }> = [];
  const allUnmatchedGloss = new Map<string, Set<string>>();
  for (const piece of parsedPieces) {
    resetKeys();
    const stripped = stripBodyTitle(
      stripInlineBibliographySection(stripAuthoringNotes(piece.body)),
    );
    const unmatchedGloss = new Set<string>();
    const ctx: ResolveCtx = {
      glossaryTermPolishToId,
      citationPositionToBibId: citationMaps[piece.label],
      pieceLabel: piece.label,
      unmatchedGloss,
    };
    const items = buildContent(stripped, ctx);
    if (unmatchedGloss.size > 0) allUnmatchedGloss.set(piece.label, unmatchedGloss);
    let doc: SanityDoc;
    if (piece.docType === 'article') {
      doc = buildArticleDoc(piece.frontmatter, items);
    } else {
      doc = buildProcedureDoc(piece.frontmatter, items);
    }
    const citationCount = items
      .flatMap((it) => {
        if (it._type === 'block') return (it as Block).markDefs.filter((m) => m._type === 'citation');
        if (it._type === 'callout') {
          return (it as Callout).content.flatMap((b) =>
            b.markDefs.filter((m) => m._type === 'citation'),
          );
        }
        return [];
      }).length;
    const glossaryCount = items
      .flatMap((it) => {
        if (it._type === 'block') return (it as Block).markDefs.filter((m) => m._type === 'glossaryTerm');
        if (it._type === 'callout') {
          return (it as Callout).content.flatMap((b) =>
            b.markDefs.filter((m) => m._type === 'glossaryTerm'),
          );
        }
        return [];
      }).length;
    contentDocs.push({ label: piece.label, docType: piece.docType, doc });
    console.log(
      `  ${piece.label}: ${items.length} blocks/callouts, ${citationCount} citations, ${glossaryCount} glossary marks`,
    );
  }

  if (allUnmatchedGloss.size > 0) {
    console.log('\n⚠ Unmatched gloss markers (rendered as plain text):');
    for (const [label, terms] of allUnmatchedGloss.entries()) {
      console.log(`  ${label}:`);
      for (const t of terms) console.log(`    [gloss:${t}|...]`);
    }
  }

  if (dryRun) {
    console.log('\n=== DRY RUN SUMMARY ===');
    console.log(`Glossary entries  : ${glossEntries.length}`);
    console.log(`  Matched (term)  : ${glossMatchedByTerm}`);
    console.log(`  Matched (slug)  : ${glossMatchedBySlug}`);
    console.log(`  New             : ${glossNew}`);
    console.log(`Bibliography refs : ${uniqueRefs.length}`);
    console.log(`  Slug-exact      : ${bibSlugExact}`);
    console.log(`  Fingerprint     : ${bibFingerprint}`);
    console.log(`  New             : ${bibNew}`);
    console.log(`  PMIDs recovered : ${bibPmidRecovered}`);
    console.log(`Content docs      : ${contentDocs.length}`);
    for (const c of contentDocs) console.log(`  ${c.doc._id} (${c.docType})`);
    console.log('\n✓ Dry-run complete. No writes performed.');
    return;
  }

  console.log(
    `\n→ Stage 1/4: Glossary — patching ${glossMatchedByTerm + glossMatchedBySlug} existing + creating ${glossNew} new`,
  );
  for (const m of glossAudit.values()) {
    try {
      await patchOrCreateGlossary(m, glossarySlugToId);
      process.stdout.write('.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ glossary ${m.packageEntry.slug} → ${m.liveId} — ${msg}`);
      throw err;
    }
  }
  console.log(`\n  ✓ ${glossEntries.length} glossary docs processed`);

  console.log(`\n→ Stage 2/4: Bibliography — creating ${bibNew} new docs`);
  for (const m of bibAudit.values()) {
    if (m.status !== 'new') continue;
    const doc = buildBibDoc(m.packageRef);
    try {
      await client.createOrReplace(doc);
      process.stdout.write('.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n  ✗ bib ${doc._id} — ${msg}`);
      throw err;
    }
  }
  console.log(`\n  ✓ ${bibNew} new bibReference docs created`);

  console.log(`\n→ Stage 3/4: Content — seeding ${contentDocs.length} docs`);
  for (const c of contentDocs) {
    try {
      await client.createOrReplace(c.doc);
      console.log(`  ✓ ${c.doc._id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${c.doc._id} — ${msg}`);
      throw err;
    }
  }

  console.log('\n→ Stage 4/4: Cross-links (full graph)…');
  const CROSS_LINKS: Record<string, { relatedArticles: string[]; relatedProcedures: string[] }> = {
    'article-choroba-dupuytrena-leczenie-operacyjne': {
      relatedArticles: ['article-choroba-dupuytrena'],
      relatedProcedures: [
        'procedure-fasciektomia-ograniczona',
        'procedure-aponeurotomia-iglowa-przezskorna',
      ],
    },
    'article-choroba-dupuytrena': {
      relatedArticles: ['article-choroba-dupuytrena-leczenie-operacyjne'],
      relatedProcedures: [
        'procedure-fasciektomia-ograniczona',
        'procedure-aponeurotomia-iglowa-przezskorna',
      ],
    },
    'procedure-fasciektomia-ograniczona': {
      relatedArticles: [
        'article-choroba-dupuytrena-leczenie-operacyjne',
        'article-choroba-dupuytrena',
      ],
      relatedProcedures: ['procedure-aponeurotomia-iglowa-przezskorna'],
    },
    'procedure-aponeurotomia-iglowa-przezskorna': {
      relatedArticles: [
        'article-choroba-dupuytrena-leczenie-operacyjne',
        'article-choroba-dupuytrena',
      ],
      relatedProcedures: ['procedure-fasciektomia-ograniczona'],
    },
  };
  for (const [docId, links] of Object.entries(CROSS_LINKS)) {
    const relatedArticles = links.relatedArticles.map((id, i) => ({
      _key: `ra-${i}`,
      _type: 'reference' as const,
      _ref: id,
    }));
    const relatedProcedures = links.relatedProcedures.map((id, i) => ({
      _key: `rp-${i}`,
      _type: 'reference' as const,
      _ref: id,
    }));
    try {
      await client.patch(docId).set({ relatedArticles, relatedProcedures }).commit();
      console.log(`  ✓ ${docId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${docId} — ${msg}`);
      throw err;
    }
  }

  console.log('\n✓ Seed complete.');
  console.log('\nNext steps:');
  console.log('  1. Trigger a Vercel rebuild on the site project.');
  console.log('  2. Smoke-test:');
  console.log('     - /pl/blog/choroba-dupuytrena/');
  console.log('     - /pl/blog/choroba-dupuytrena-leczenie-operacyjne/');
  console.log('     - /pl/zabiegi/fasciektomia-ograniczona/');
  console.log('     - /pl/zabiegi/aponeurotomia-iglowa-przezskorna/');
  console.log(
    `  3. Revoke the write token at https://www.sanity.io/manage/project/${PROJECT_ID}/api → Tokens.`,
  );
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('\n✗ Seed failed:', msg);
  process.exit(1);
});
