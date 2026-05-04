// site/scripts/seed-cts-pl-procedure.ts
//
// One-shot importer for the Polish CTS procedure page from
// 01-brand-system/inbox/drgladysz-procedure-otwarte-odbarczenie-kanalu-nadgarstka-pl-draft-v1_1.md
//
// Idempotent. Three stages:
//   1. Ensure all bibReferences referenced by {n} markers exist (look up by
//      DOI; create with slug-form _id if not).
//   2. Ensure all glossary docs referenced by [g:slug|...] markers exist —
//      patches PL fields if missing (most are already covered by
//      update-glossary-pl-cts.ts, but the script is defensive).
//   3. createOrReplace the procedurePage doc with PL content +
//      `language: 'pl'`, `category: 'hand-surgery'`, `audience: 'mixed'`,
//      `slug: 'zespol-ciesni-nadgarstka'`.
//
// Body content is parsed from the markdown by a self-contained walker that
// understands h2/h3 headings, paragraphs, bullet/numbered lists, blockquoted
// callouts (`> **Uwaga techniczna.**` → callout kind:'warning';
// `> **Punkty kluczowe.**` → callout kind:'pearl').
//
// Inline DSL:
//   [g:slug|displayed text]   — glossary mark
//   {n} or {n,m}              — citation positions (1-indexed into local refs)
//   *italic*  / **bold**      — decorators
//
// Run from site/:
//   node --experimental-strip-types --env-file=.env.local scripts/seed-cts-pl-procedure.ts

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91';
const DATASET = process.env.PUBLIC_SANITY_DATASET || 'production';
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';

if (!TOKEN) {
  console.error('Missing SANITY_API_DEVELOPER_TOKEN or SANITY_API_WRITE_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-10-01',
  useCdn: false,
});

const SOURCE_PATH = resolve(
  __dirname,
  '../../01-brand-system/inbox/drgladysz-procedure-otwarte-odbarczenie-kanalu-nadgarstka-pl-draft-v1_1.md',
);

const SLUG = 'zespol-ciesni-nadgarstka';
const PROCEDURE_ID = `procedure-${SLUG}`;

// Author UUID (Phase 5 seed). Sanity reference target for `author`.
const AUTHOR_ID = '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472';

// ---- Reference table (hardcoded by position, looked up by DOI in Sanity) --
// 17 references in document order matching {n} markers in the body.
interface RefSeed {
  slug: string; // slug-form _id suffix; doc _id will be `bibref-{slug}` for new docs
  authors: string[];
  title: string;
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  url?: string;
  pubType?: 'journal' | 'guideline' | 'book';
  publisher?: string;
}

const REFS: RefSeed[] = [
  {
    slug: 'graham-2006-cts6',
    authors: ['Graham B', 'Regehr G', 'Naglie G', 'Wright JG'],
    title:
      'Development and validation of diagnostic criteria for carpal tunnel syndrome',
    journal: 'J Hand Surg Am',
    year: 2006,
    volume: '31',
    issue: '6',
    pages: '919-924',
    doi: '10.1016/j.jhsa.2006.03.005',
    pubType: 'journal',
  },
  {
    slug: 'aaos-cts-cpg-2024',
    authors: ['American Academy of Orthopaedic Surgeons'],
    title:
      'Management of Carpal Tunnel Syndrome — Evidence-Based Clinical Practice Guideline',
    journal: 'AAOS',
    year: 2024,
    url: 'https://www.aaos.org/cts2cpg',
    pubType: 'guideline',
    publisher: 'American Academy of Orthopaedic Surgeons',
  },
  {
    slug: 'shapiro-2025-aaos-summary',
    authors: ['Shapiro LM', 'Kamal RN'],
    title:
      'American Academy of Orthopaedic Surgeons/ASSH Clinical Practice Guideline Summary: Management of Carpal Tunnel Syndrome',
    journal: 'J Am Acad Orthop Surg',
    year: 2025,
    volume: '33',
    issue: '7',
    pages: 'e356-e366',
    doi: '10.5435/JAAOS-D-24-01179',
    pubType: 'journal',
  },
  {
    slug: 'atroshi-2013-methylpred-rct',
    authors: ['Atroshi I', 'Flondell M', 'Hofer M', 'Ranstam J'],
    title:
      'Methylprednisolone injections for the carpal tunnel syndrome: a randomized, placebo-controlled trial',
    journal: 'Ann Intern Med',
    year: 2013,
    volume: '159',
    issue: '5',
    pages: '309-317',
    doi: '10.7326/0003-4819-159-5-201309030-00004',
    pubType: 'journal',
  },
  {
    slug: 'hofer-2021-extended-followup',
    authors: ['Hofer M', 'Ranstam J', 'Atroshi I'],
    title:
      'Extended follow-up of local steroid injection for carpal tunnel syndrome: a randomized clinical trial',
    journal: 'JAMA Netw Open',
    year: 2021,
    volume: '4',
    issue: '10',
    pages: 'e2130753',
    doi: '10.1001/jamanetworkopen.2021.30753',
    pubType: 'journal',
  },
  {
    slug: 'panchal-2010-kaplan-line',
    authors: ['Panchal AP', 'Trzeciak MA'],
    title:
      "The clinical application of Kaplan's cardinal line as a surface marker for the superficial palmar arch",
    journal: 'Hand (N Y)',
    year: 2010,
    volume: '5',
    issue: '2',
    pages: '155-159',
    doi: '10.1007/s11552-009-9229-0',
    pubType: 'journal',
  },
  {
    slug: 'padua-2016-cts-lancet',
    authors: ['Padua L', 'Coraci D', 'Erra C'],
    title:
      'Carpal tunnel syndrome: clinical features, diagnosis, and management',
    journal: 'Lancet Neurol',
    year: 2016,
    volume: '15',
    issue: '12',
    pages: '1273-1284',
    doi: '10.1016/S1474-4422(16)30231-9',
    pubType: 'journal',
  },
  {
    slug: 'lalonde-2020-walant-book',
    authors: ['Lalonde DH'],
    title: 'Wide Awake Hand Surgery and Therapy Tips',
    journal: 'Thieme',
    year: 2020,
    pubType: 'book',
    publisher: 'Thieme',
  },
  {
    slug: 'mosier-2013-recurrent-cts',
    authors: ['Mosier BA', 'Hughes TB'],
    title: 'Recurrent carpal tunnel syndrome',
    journal: 'Hand Clin',
    year: 2013,
    volume: '29',
    issue: '3',
    pages: '427-434',
    doi: '10.1016/j.hcl.2013.04.011',
    pubType: 'journal',
  },
  {
    slug: 'mackinnon-1991-internal-neurolysis',
    authors: ['Mackinnon SE', 'McCabe S', 'Murray JF'],
    title:
      'Internal neurolysis fails to improve the results of primary carpal tunnel decompression',
    journal: 'J Hand Surg Am',
    year: 1991,
    volume: '16',
    issue: '2',
    pages: '211-218',
    doi: '10.1016/S0363-5023(10)80098-7',
    pubType: 'journal',
  },
  {
    slug: 'wu-2023-monocryl-vs-nylon',
    authors: ['Wu E', 'Allen R', 'Bayne C', 'Szabo R'],
    title:
      'Prospective randomized controlled trial comparing the effect of Monocryl versus nylon sutures on patient- and observer-assessed outcomes following carpal tunnel surgery',
    journal: 'J Hand Surg Eur Vol',
    year: 2023,
    volume: '48',
    issue: '11',
    pages: '1084-1091',
    doi: '10.1177/17531934231178383',
    pubType: 'journal',
  },
  {
    slug: 'vasiliadis-2014-endoscopic-cochrane',
    authors: [
      'Vasiliadis HS',
      'Georgoulas P',
      'Shrier I',
      'Salanti G',
      'Scholten RJPM',
    ],
    title: 'Endoscopic release for carpal tunnel syndrome',
    journal: 'Cochrane Database Syst Rev',
    year: 2014,
    issue: '1',
    pages: 'CD008265',
    doi: '10.1002/14651858.CD008265.pub2',
    pubType: 'journal',
  },
  {
    slug: 'greco-2023-rtw-cts',
    authors: ['Greco AT', 'Boyer MI', 'Calfee RP'],
    title:
      'Determinants of return to activity and work after carpal tunnel release: a systematic review and meta-analysis',
    journal: 'Expert Rev Med Devices',
    year: 2023,
    volume: '20',
    issue: '5',
    pages: '397-409',
    doi: '10.1080/17434440.2023.2195549',
    pubType: 'journal',
  },
  {
    slug: 'bonatz-2024-pillar-pain-meta',
    authors: ['Bonatz E', 'Rajan S', 'Klausner AM', 'Frizzi JD'],
    title:
      'Pillar pain after minimally invasive and standard open carpal tunnel release: a systematic review and meta-analysis',
    journal: 'J Hand Surg Glob Online',
    year: 2024,
    volume: '6',
    issue: '4',
    pages: '523-528',
    doi: '10.1016/j.jhsg.2023.11.006',
    pubType: 'journal',
  },
  {
    slug: 'atroshi-2015-jama-followup',
    authors: ['Atroshi I', 'Hofer M', 'Larsson GU', 'Ranstam J'],
    title:
      'Extended follow-up of a randomized clinical trial of open vs endoscopic release surgery for carpal tunnel syndrome',
    journal: 'JAMA',
    year: 2015,
    volume: '314',
    issue: '13',
    pages: '1399-1401',
    doi: '10.1001/jama.2015.12208',
    pubType: 'journal',
  },
  {
    slug: 'louie-2012-long-term-outcomes',
    authors: ['Louie DL', 'Earp BE', 'Blazar PE'],
    title:
      'Long-term outcomes of carpal tunnel release: a critical review of the literature',
    journal: 'Hand (N Y)',
    year: 2012,
    volume: '7',
    issue: '3',
    pages: '242-246',
    doi: '10.1007/s11552-012-9429-x',
    pubType: 'journal',
  },
  {
    slug: 'watchmaker-1996-pcbmn-avoidance',
    authors: ['Watchmaker GP', 'Weber D', 'Mackinnon SE'],
    title:
      'Avoidance of transection of the palmar cutaneous branch of the median nerve in carpal tunnel release',
    journal: 'J Hand Surg Am',
    year: 1996,
    volume: '21',
    issue: '4',
    pages: '644-650',
    doi: '10.1016/S0363-5023(96)80019-0',
    pubType: 'journal',
  },
];

// ---- Glossary fallback seeds (only used if a slug is not yet in Sanity) ---
// All 41 PL terms are expected to be patched by update-glossary-pl-cts.ts
// before this script runs. This minimal map ensures the procedure can still
// seed if any slug is missing — it creates a stub doc with PL data.
const GLOSSARY_FALLBACK: Record<
  string,
  { term: string; category: string; shortDefinition: string }
> = {
  // Empty — populated only if a missing-slug warning fires; the procedure
  // body's marks must all map to existing docs by the time we publish.
};

// ---- Sanity client helpers --------------------------------------------------

let _keyCounter = 0;
const k = () => `k${(_keyCounter++).toString(36)}`;

interface Span {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
}
interface MarkDef {
  _type: 'glossaryTerm' | 'citation';
  _key: string;
  [k: string]: unknown;
}
interface Block {
  _type: 'block';
  _key: string;
  style: string;
  markDefs: MarkDef[];
  children: Span[];
  listItem?: 'bullet' | 'number';
  level?: number;
}
interface CalloutBlock {
  _type: 'callout';
  _key: string;
  kind: 'info' | 'warning' | 'pearl';
  body: Block[];
}
type ContentBlock = Block | CalloutBlock;

const span = (text: string, marks: string[] = []): Span => ({
  _type: 'span',
  _key: k(),
  text,
  marks,
});

// ---- Inline tokenizer (same DSL as seed-procedure-octr.ts) ------------------

type Token =
  | { kind: 'text'; text: string }
  | { kind: 'gloss'; slug: string; displayed: string }
  | { kind: 'cite'; positions: number[] };

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith('[g:', i)) {
      const close = input.indexOf(']', i);
      if (close === -1) {
        out.push({ kind: 'text', text: input.slice(i) });
        break;
      }
      const inner = input.slice(i + 3, close);
      const pipe = inner.indexOf('|');
      if (pipe === -1) {
        out.push({ kind: 'text', text: input.slice(i, close + 1) });
        i = close + 1;
        continue;
      }
      const slug = inner.slice(0, pipe).trim();
      const displayed = inner.slice(pipe + 1).trim();
      out.push({ kind: 'gloss', slug, displayed });
      i = close + 1;
      continue;
    }
    if (input[i] === '{' && /\d/.test(input[i + 1] ?? '')) {
      const close = input.indexOf('}', i);
      if (close === -1) {
        out.push({ kind: 'text', text: input.slice(i) });
        break;
      }
      const positions = input
        .slice(i + 1, close)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      out.push({ kind: 'cite', positions });
      i = close + 1;
      continue;
    }
    let j = i;
    while (j < input.length) {
      const slice = input.slice(j);
      if (slice.startsWith('[g:') || (slice[0] === '{' && /\d/.test(slice[1] ?? ''))) {
        break;
      }
      j++;
    }
    out.push({ kind: 'text', text: input.slice(i, j) });
    i = j;
  }
  return out;
}

function applyEmphasis(text: string, extraMarks: string[] = []): Span[] {
  const out: Span[] = [];
  const parts: { text: string; bold: boolean }[] = [];
  let cursor = 0;
  const boldHits = [...text.matchAll(/\*\*([^*]+)\*\*/g)];
  if (boldHits.length === 0) {
    parts.push({ text, bold: false });
  } else {
    for (const m of boldHits) {
      const idx = m.index ?? 0;
      if (idx > cursor) parts.push({ text: text.slice(cursor, idx), bold: false });
      parts.push({ text: m[1], bold: true });
      cursor = idx + m[0].length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), bold: false });
  }
  for (const part of parts) {
    if (part.bold) {
      out.push(span(part.text, [...extraMarks, 'strong']));
      continue;
    }
    const itHits = [...part.text.matchAll(/\*([^*]+)\*/g)];
    if (itHits.length === 0) {
      if (part.text) out.push(span(part.text, extraMarks));
      continue;
    }
    let c = 0;
    for (const m of itHits) {
      const idx = m.index ?? 0;
      if (idx > c) out.push(span(part.text.slice(c, idx), extraMarks));
      out.push(span(m[1], [...extraMarks, 'em']));
      c = idx + m[0].length;
    }
    if (c < part.text.length) out.push(span(part.text.slice(c), extraMarks));
  }
  return out;
}

// ---- Block builders ---------------------------------------------------------
// Citation/glossary resolution is parameterised by maps the caller provides.

interface ResolverContext {
  citationByPosition: Record<number, string>;
  glossaryIds: Record<string, string>;
}

function richBlock(
  input: string,
  opts: {
    style?: string;
    listItem?: 'bullet' | 'number';
    level?: number;
  },
  ctx: ResolverContext,
): Block {
  const tokens = tokenize(input);
  const markDefs: MarkDef[] = [];
  const children: Span[] = [];

  const attachCitations = (positions: number[]) => {
    if (positions.length === 0 || children.length === 0) return;
    for (const pos of positions) {
      const refId = ctx.citationByPosition[pos];
      if (!refId) {
        throw new Error(`No bibReference mapped for citation position ${pos}`);
      }
      const mark: MarkDef = {
        _type: 'citation',
        _key: k(),
        reference: { _type: 'reference', _ref: refId },
      };
      markDefs.push(mark);
      const last = children[children.length - 1];
      last.marks = [...last.marks, mark._key];
    }
  };

  for (const tok of tokens) {
    if (tok.kind === 'text') {
      children.push(...applyEmphasis(tok.text));
      continue;
    }
    if (tok.kind === 'gloss') {
      const glossId = ctx.glossaryIds[tok.slug];
      if (!glossId) {
        throw new Error(`Unknown glossary slug: ${tok.slug}`);
      }
      const mark: MarkDef = {
        _type: 'glossaryTerm',
        _key: k(),
        term: { _type: 'reference', _ref: glossId },
      };
      markDefs.push(mark);
      children.push(span(tok.displayed, [mark._key]));
      continue;
    }
    if (tok.kind === 'cite') {
      attachCitations(tok.positions);
      continue;
    }
  }

  if (children.length === 0) children.push(span(''));

  return {
    _type: 'block',
    _key: k(),
    style: opts.style ?? 'normal',
    markDefs,
    children,
    ...(opts.listItem ? { listItem: opts.listItem, level: opts.level ?? 1 } : {}),
  };
}

// ---- Section parser: walks markdown lines into ContentBlock[] --------------

function parseSection(rawLines: string[], ctx: ResolverContext): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let i = 0;
  const lines = rawLines;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    // h3 subsection
    if (trimmed.startsWith('### ')) {
      blocks.push(richBlock(trimmed.slice(4), { style: 'h3' }, ctx));
      i++;
      continue;
    }
    // h2 subsection (rare inside § sections, but handled)
    if (trimmed.startsWith('## ')) {
      blocks.push(richBlock(trimmed.slice(3), { style: 'h2' }, ctx));
      i++;
      continue;
    }
    // Blockquote callout
    if (trimmed.startsWith('> ')) {
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        calloutLines.push(lines[i].trim().slice(2));
        i++;
      }
      const text = calloutLines.join(' ').trim();
      // Detect kind by leading bold word
      let kind: CalloutBlock['kind'] = 'info';
      let body = text;
      const m = text.match(/^\*\*([^.]+)\.\*\*\s*(.*)$/);
      if (m) {
        const word = m[1].toLowerCase();
        if (word.includes('uwaga')) kind = 'warning';
        else if (word.includes('punkt')) kind = 'pearl';
        else if (word.includes('konwencja')) kind = 'info';
        body = m[2];
      }
      blocks.push({
        _type: 'callout',
        _key: k(),
        kind,
        body: [richBlock(body, {}, ctx)],
      });
      continue;
    }
    // Bullet list
    if (trimmed.startsWith('- ')) {
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        blocks.push(
          richBlock(
            lines[i].trim().slice(2),
            { listItem: 'bullet', level: 1 },
            ctx,
          ),
        );
        i++;
      }
      continue;
    }
    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^\d+\.\s/, '');
        blocks.push(
          richBlock(text, { listItem: 'number', level: 1 }, ctx),
        );
        i++;
      }
      continue;
    }
    // Paragraph — accumulate consecutive non-empty, non-list, non-quote lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('### ') &&
      !lines[i].trim().startsWith('## ') &&
      !lines[i].trim().startsWith('> ') &&
      !lines[i].trim().startsWith('- ') &&
      !/^\d+\.\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(richBlock(paraLines.join(' '), {}, ctx));
    }
  }
  return blocks;
}

// ---- Markdown source segmenter ---------------------------------------------

interface InboxSegments {
  leadParagraph: string;
  keyPoints: { question: string; findings: string; meaning: string };
  sections: Map<string, string[]>; // key: '§ 01' / '§ 02' / ... / 'patientSummary'
  faq: { question: string; answer: string[] }[];
  references: string[]; // numbered list lines (for sanity-check; not used directly)
}

function segmentInbox(): InboxSegments {
  const md = readFileSync(SOURCE_PATH, 'utf8');
  const lines = md.split(/\r?\n/);

  // Lead paragraph: lives in the `## Lead` section, blockquoted
  const leadStart = lines.findIndex((l) => l.startsWith('## Lead'));
  let leadParagraph = '';
  if (leadStart >= 0) {
    let i = leadStart + 1;
    while (i < lines.length && !lines[i].startsWith('## ')) {
      const t = lines[i].trim();
      if (t.startsWith('> ')) leadParagraph += t.slice(2) + ' ';
      i++;
    }
    leadParagraph = leadParagraph.trim();
  }

  // Key Points
  const kpStart = lines.findIndex((l) => l.startsWith('## Key Points'));
  const keyPoints = { question: '', findings: '', meaning: '' };
  if (kpStart >= 0) {
    let i = kpStart + 1;
    let current: 'question' | 'findings' | 'meaning' | '' = '';
    while (i < lines.length && !lines[i].startsWith('## ') && !lines[i].startsWith('---')) {
      const t = lines[i].trim();
      if (t === '**Pytanie kliniczne**') current = 'question';
      else if (t === '**Wskazania i przebieg**') current = 'findings';
      else if (t === '**Znaczenie**') current = 'meaning';
      else if (t && current) {
        keyPoints[current] += (keyPoints[current] ? ' ' : '') + t;
      }
      i++;
    }
  }

  // 10 § sections + Dla pacjentów + FAQ
  const sectionPattern = /^## (§ \d+ — .+|Dla pacjentów .*|FAQ — .+|Standardowy disclaimer.*)$/;
  const sections = new Map<string, string[]>();
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(sectionPattern);
    if (m) {
      if (currentKey) sections.set(currentKey, currentLines);
      const heading = m[1];
      // Normalize key
      if (heading.startsWith('§ 01')) currentKey = '§ 01';
      else if (heading.startsWith('§ 02')) currentKey = '§ 02';
      else if (heading.startsWith('§ 03')) currentKey = '§ 03';
      else if (heading.startsWith('§ 04')) currentKey = '§ 04';
      else if (heading.startsWith('§ 05')) currentKey = '§ 05';
      else if (heading.startsWith('§ 06')) currentKey = '§ 06';
      else if (heading.startsWith('§ 07')) currentKey = '§ 07';
      else if (heading.startsWith('§ 08')) currentKey = '§ 08';
      else if (heading.startsWith('§ 09')) currentKey = '§ 09';
      else if (heading.startsWith('§ 10')) currentKey = '§ 10';
      else if (heading.startsWith('Dla pacjentów')) currentKey = 'patientSummary';
      else if (heading.startsWith('FAQ')) currentKey = 'faq';
      else currentKey = null;
      currentLines = [];
    } else if (currentKey) {
      // Drop horizontal rules and final disclaimer block
      if (line.startsWith('---')) continue;
      currentLines.push(line);
    }
  }
  if (currentKey) sections.set(currentKey, currentLines);

  // Parse FAQ section into Q/A pairs
  const faq: { question: string; answer: string[] }[] = [];
  const faqLines = sections.get('faq') ?? [];
  let faqQuestion = '';
  let faqAnswer: string[] = [];
  for (const line of faqLines) {
    const t = line.trim();
    if (t.startsWith('### ')) {
      if (faqQuestion) faq.push({ question: faqQuestion, answer: faqAnswer });
      faqQuestion = t.slice(4);
      faqAnswer = [];
    } else if (t.startsWith('> ')) {
      // FAQ-section convention block at top — skip
      continue;
    } else {
      faqAnswer.push(line);
    }
  }
  if (faqQuestion) faq.push({ question: faqQuestion, answer: faqAnswer });

  return {
    leadParagraph,
    keyPoints,
    sections,
    faq,
    references: [],
  };
}

// ---- Sanity ensure helpers --------------------------------------------------

async function ensureBibReferences(refs: RefSeed[]): Promise<Record<number, string>> {
  // Resolve by DOI when present (most reliable). Fall back to slug-form _id
  // lookup. Create with `bibref-{slug}` _id if not found.
  const dois = refs.map((r) => r.doi).filter(Boolean) as string[];
  const existing = await client.fetch<{ _id: string; doi?: string }[]>(
    `*[_type == "bibReference" && doi in $dois]{_id, doi}`,
    { dois },
  );
  const byDoi = new Map(
    existing.filter((d) => d.doi).map((d) => [d.doi as string, d._id]),
  );

  const positionToId: Record<number, string> = {};
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const position = i + 1;
    let id: string | undefined;
    if (ref.doi && byDoi.has(ref.doi)) {
      id = byDoi.get(ref.doi);
    } else {
      // Look up by candidate slug-form id
      const candidateId = `bibref-${ref.slug}`;
      const direct = await client.getDocument(candidateId);
      if (direct) {
        id = candidateId;
      } else {
        // Create
        await client.createOrReplace({
          _id: candidateId,
          _type: 'bibReference',
          title: ref.title,
          authors: ref.authors,
          journal: ref.journal,
          year: ref.year,
          ...(ref.volume ? { volume: ref.volume } : {}),
          ...(ref.issue ? { issue: ref.issue } : {}),
          ...(ref.pages ? { pages: ref.pages } : {}),
          ...(ref.doi ? { doi: ref.doi } : {}),
          ...(ref.pmid ? { pmid: ref.pmid } : {}),
          ...(ref.url ? { url: ref.url } : {}),
          ...(ref.pubType ? { pubType: ref.pubType } : {}),
          ...(ref.publisher ? { publisher: ref.publisher } : {}),
        });
        id = candidateId;
        console.log(`  + bibref created: ${candidateId}`);
      }
    }
    positionToId[position] = id!;
  }
  return positionToId;
}

async function ensureGlossaryIds(slugs: string[]): Promise<Record<string, string>> {
  const ids = slugs.map((s) => `glossary-${s}`);
  const existing = await client.fetch<{ _id: string }[]>(
    `*[_type == "glossaryTerm" && _id in $ids]{_id}`,
    { ids },
  );
  const found = new Set(existing.map((d) => d._id));
  const out: Record<string, string> = {};
  for (const slug of slugs) {
    const id = `glossary-${slug}`;
    if (!found.has(id)) {
      const fallback = GLOSSARY_FALLBACK[slug];
      if (fallback) {
        await client.createOrReplace({
          _id: id,
          _type: 'glossaryTerm',
          term: fallback.term,
          slug: { _type: 'slug', current: slug },
          category: fallback.category,
          shortDefinition: fallback.shortDefinition,
        });
        console.log(`  + glossary stub created: ${id}`);
      } else {
        throw new Error(
          `Glossary slug ${slug} not in Sanity and no fallback seed defined. Run update-glossary-pl-cts.ts first.`,
        );
      }
    }
    out[slug] = id;
  }
  return out;
}

// ---- Glossary slugs used by procedure body ----------------------------------
// Pre-computed by scanning the inbox markdown; used to ensure all are present
// before parsing (so we get a clear error rather than a confusing throw mid-parse).
function extractGlossarySlugs(text: string): string[] {
  const slugs = new Set<string>();
  for (const m of text.matchAll(/\[g:([a-z0-9-]+)\|/g)) slugs.add(m[1]);
  return [...slugs];
}

// ---- Main -------------------------------------------------------------------

async function main() {
  console.log('Reading inbox markdown...');
  const segments = segmentInbox();

  console.log('Stage 1: bibReferences...');
  const citationByPosition = await ensureBibReferences(REFS);

  console.log('Stage 2: glossary refs...');
  const allText = [
    segments.leadParagraph,
    ...Array.from(segments.sections.values()).flat(),
    ...segments.faq.flatMap((f) => [f.question, ...f.answer]),
  ].join('\n');
  const glossarySlugs = extractGlossarySlugs(allText);
  console.log(`  uses ${glossarySlugs.length} glossary terms`);
  const glossaryIds = await ensureGlossaryIds(glossarySlugs);

  const ctx: ResolverContext = { citationByPosition, glossaryIds };

  console.log('Stage 3: building procedure document...');
  const indications = parseSection(segments.sections.get('§ 01') ?? [], ctx);
  const contraindications = parseSection(segments.sections.get('§ 02') ?? [], ctx);
  const anatomy = parseSection(segments.sections.get('§ 03') ?? [], ctx);
  const positioning = parseSection(segments.sections.get('§ 04') ?? [], ctx);
  const approach = parseSection(segments.sections.get('§ 05') ?? [], ctx);
  // Key steps (§ 06) — special: walks `### Etap N — Title` h3 + paragraphs +
  // following `> **Uwaga techniczna.**` callout.
  const keyStepsLines = segments.sections.get('§ 06') ?? [];
  const keySteps = parseKeySteps(keyStepsLines, ctx);
  const closure = parseSection(segments.sections.get('§ 07') ?? [], ctx);
  const aftercare = parseSection(segments.sections.get('§ 08') ?? [], ctx);
  const complications = parseSection(segments.sections.get('§ 09') ?? [], ctx);
  const evidence = parseSection(segments.sections.get('§ 10') ?? [], ctx);
  const patientSummary = parseSection(
    segments.sections.get('patientSummary') ?? [],
    ctx,
  );
  const faq = segments.faq.map((f) => ({
    _type: 'faqItem',
    _key: k(),
    question: f.question,
    answer: parseSection(f.answer, ctx).filter(
      (b): b is Block => b._type === 'block',
    ),
  }));

  const doc = {
    _id: PROCEDURE_ID,
    _type: 'procedurePage',
    title: 'Zespół cieśni nadgarstka — leczenie operacyjne',
    slug: { _type: 'slug', current: SLUG },
    category: 'hand-surgery',
    language: 'pl',
    audience: 'mixed',
    lastUpdated: '2026-05-03',
    summary:
      'Otwarte odbarczenie kanału nadgarstka — opis zabiegu, wskazań, anatomii chirurgicznej, postępowania pooperacyjnego oraz powikłań w zespole cieśni nadgarstka.',
    keyPoints: segments.keyPoints,
    indications,
    contraindications,
    anatomy,
    positioning,
    approach,
    keySteps,
    closure,
    aftercare,
    complications,
    evidence,
    patientSummary,
    faq,
    seoTitle:
      'Zespół cieśni nadgarstka — leczenie operacyjne — dr Mateusz Gładysz',
    seoDescription:
      'Zespół cieśni nadgarstka — opis leczenia operacyjnego (otwarte odbarczenie kanału nadgarstka). Wskazania, przebieg zabiegu, rekonwalescencja, powikłania.',
    relatedArticles: [
      {
        _type: 'reference',
        _key: k(),
        _ref: 'article-zespol-ciesni-nadgarstka',
        _weak: true,
      },
      {
        _type: 'reference',
        _key: k(),
        _ref: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny',
        _weak: true,
      },
    ],
  };

  console.log(`Stage 4: createOrReplace ${PROCEDURE_ID}...`);
  await client.createOrReplace(doc);
  console.log('Done.');
}

// ---- Key Steps parser -------------------------------------------------------
// Walks `### Etap N — Title` headers, gathers paragraphs and the trailing
// `> **Uwaga techniczna.** ...` callout into a procedureStep object.
interface KeyStep {
  _type: 'procedureStep';
  _key: string;
  title: string;
  description: Block[];
  pitfall?: string;
}

function parseKeySteps(lines: string[], ctx: ResolverContext): KeyStep[] {
  const steps: KeyStep[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('### Etap ') || line.startsWith('### Etap ')) {
      const title = line.slice(4); // 'Etap N — Title' (drop '### ')
      const descLines: string[] = [];
      let pitfall: string | undefined;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('### ')) {
        const t = lines[i].trim();
        if (t.startsWith('> ')) {
          // Callout = pitfall
          const calloutLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('> ')) {
            calloutLines.push(lines[i].trim().slice(2));
            i++;
          }
          const ctext = calloutLines.join(' ').trim();
          // Strip leading '**Uwaga techniczna.**' so the pitfall reads as a
          // standalone paragraph (the [slug].astro template adds the label).
          pitfall = ctext.replace(/^\*\*[^.]+\.\*\*\s*/, '').replace(/\s+/g, ' ');
          continue;
        }
        descLines.push(lines[i]);
        i++;
      }
      const description = parseSection(descLines, ctx).filter(
        (b): b is Block => b._type === 'block',
      );
      // Strip the marks from the pitfall (it's a plain `text` field on the
      // schema, no rich text). Glossary tooltips don't render in pitfalls.
      const cleanPitfall = pitfall
        ? pitfall
            .replace(/\[g:[a-z0-9-]+\|([^\]]+)\]/g, '$1')
            .replace(/\{[\d,\s]+\}/g, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .trim()
        : undefined;
      steps.push({
        _type: 'procedureStep',
        _key: k(),
        title,
        description,
        ...(cleanPitfall ? { pitfall: cleanPitfall } : {}),
      });
    } else {
      i++;
    }
  }
  return steps;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
