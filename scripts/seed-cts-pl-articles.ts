// site/scripts/seed-cts-pl-articles.ts
//
// Seeds two Polish CTS articles from inbox markdown:
//   - patient: drgladysz-article-zespol-ciesni-nadgarstka-pacjent-pl-draft-v1_1.md
//             → article-zespol-ciesni-nadgarstka (category: patient)
//   - expert: drgladysz-article-zespol-ciesni-nadgarstka-ekspercki-pl-draft-v1_1.md
//             → article-zespol-ciesni-nadgarstka-przeglad-kliniczny (category: expert)
//
// Idempotent. Resolves bibReferences by DOI (existing) or creates new
// `bibref-{slug}` docs. Glossary refs must already exist (run
// update-glossary-pl-cts.ts first; new slugs introduced by these articles
// are created as stubs from EXPERT_NEW_GLOSSARY).
//
// Run from site/:
//   node --experimental-strip-types --env-file=.env.local scripts/seed-cts-pl-articles.ts patient
//   node --experimental-strip-types --env-file=.env.local scripts/seed-cts-pl-articles.ts expert
//   node --experimental-strip-types --env-file=.env.local scripts/seed-cts-pl-articles.ts both

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

const AUTHOR_ID = '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472';

const INBOX_DIR = resolve(__dirname, '../../01-brand-system/inbox');

// =============================================================================
//  Inline DSL tokenizer + Portable Text builder (same shape as
//  seed-cts-pl-procedure.ts; duplicated here so the article seeder is
//  self-contained and importable without a shared module).
// =============================================================================

let _keyCounter = 0;
const k = () => `k${(_keyCounter++).toString(36)}`;

interface Span {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
}
interface MarkDef {
  _type: 'glossaryTerm' | 'citation' | 'link';
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

interface ResolverContext {
  citationByPosition: Record<number, string>;
  glossaryIds: Record<string, string>;
}

type Token =
  | { kind: 'text'; text: string }
  | { kind: 'gloss'; slug: string; displayed: string }
  | { kind: 'cite'; positions: number[] }
  | { kind: 'link'; href: string; text: string };

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
      if (pipe >= 0) {
        out.push({
          kind: 'gloss',
          slug: inner.slice(0, pipe).trim(),
          displayed: inner.slice(pipe + 1).trim(),
        });
        i = close + 1;
        continue;
      }
    }
    // Markdown link [text](url)
    if (input[i] === '[' && !input.startsWith('[g:', i)) {
      const close = input.indexOf(']', i);
      if (close >= 0 && input[close + 1] === '(') {
        const closeParen = input.indexOf(')', close + 2);
        if (closeParen >= 0) {
          out.push({
            kind: 'link',
            text: input.slice(i + 1, close),
            href: input.slice(close + 2, closeParen),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }
    if (input[i] === '{' && /\d/.test(input[i + 1] ?? '')) {
      const close = input.indexOf('}', i);
      if (close >= 0) {
        const positions = input
          .slice(i + 1, close)
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n));
        out.push({ kind: 'cite', positions });
        i = close + 1;
        continue;
      }
    }
    let j = i;
    while (j < input.length) {
      const slice = input.slice(j);
      if (
        slice.startsWith('[g:') ||
        slice[0] === '[' ||
        (slice[0] === '{' && /\d/.test(slice[1] ?? ''))
      ) {
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

function richBlock(
  input: string,
  opts: { style?: string; listItem?: 'bullet' | 'number'; level?: number },
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
      if (!glossId) throw new Error(`Unknown glossary slug: ${tok.slug}`);
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
    if (tok.kind === 'link') {
      const mark: MarkDef = {
        _type: 'link',
        _key: k(),
        href: tok.href,
        newTab: !tok.href.startsWith('/'),
      };
      markDefs.push(mark);
      children.push(...applyEmphasis(tok.text, [mark._key]));
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
    if (trimmed.startsWith('### ')) {
      blocks.push(richBlock(trimmed.slice(4), { style: 'h3' }, ctx));
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(richBlock(trimmed.slice(3), { style: 'h2' }, ctx));
      i++;
      continue;
    }
    if (trimmed.startsWith('> ')) {
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        calloutLines.push(lines[i].trim().slice(2));
        i++;
      }
      const text = calloutLines.join(' ').trim();
      let kind: CalloutBlock['kind'] = 'info';
      let body = text;
      const m = text.match(/^\*\*([^.]+)\.\*\*\s*(.*)$/);
      if (m) {
        const word = m[1].toLowerCase();
        if (word.includes('uwaga')) kind = 'warning';
        else if (word.includes('punkt')) kind = 'pearl';
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
    if (trimmed.startsWith('- ')) {
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        blocks.push(
          richBlock(lines[i].trim().slice(2), { listItem: 'bullet', level: 1 }, ctx),
        );
        i++;
      }
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^\d+\.\s/, '');
        blocks.push(richBlock(text, { listItem: 'number', level: 1 }, ctx));
        i++;
      }
      continue;
    }
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

function extractGlossarySlugs(text: string): string[] {
  const slugs = new Set<string>();
  for (const m of text.matchAll(/\[g:([a-z0-9-]+)\|/g)) slugs.add(m[1]);
  return [...slugs];
}

// =============================================================================
//  Article-specific config + reference tables
// =============================================================================

interface RefSeed {
  slug: string;
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

const PATIENT_REFS: RefSeed[] = [
  {
    slug: 'atroshi-1999-prevalence',
    authors: [
      'Atroshi I',
      'Gummesson C',
      'Johnsson R',
      'Ornstein E',
      'Ranstam J',
      'Rosén I',
    ],
    title: 'Prevalence of carpal tunnel syndrome in a general population',
    journal: 'JAMA',
    year: 1999,
    volume: '282',
    issue: '2',
    pages: '153-158',
    doi: '10.1001/jama.282.2.153',
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
];

// 57 expert article refs in document order.
const EXPERT_REFS: RefSeed[] = [
  // 1
  { slug: 'atroshi-1999-prevalence', authors: ['Atroshi I', 'Gummesson C', 'Johnsson R', 'Ornstein E', 'Ranstam J', 'Rosén I'], title: 'Prevalence of carpal tunnel syndrome in a general population', journal: 'JAMA', year: 1999, volume: '282', issue: '2', pages: '153-158', doi: '10.1001/jama.282.2.153', pubType: 'journal' },
  // 2
  { slug: 'burton-2018-trends', authors: ['Burton CL', 'Chen Y', 'Chesterton LS', 'van der Windt DA'], title: 'Trends in the prevalence, incidence and surgical management of carpal tunnel syndrome between 1993 and 2013', journal: 'BMJ Open', year: 2018, volume: '8', issue: '6', pages: 'e020166', doi: '10.1136/bmjopen-2017-020166', pubType: 'journal' },
  // 3
  { slug: 'pourmemari-2018-lifetime', authors: ['Pourmemari MH', 'Heliövaara M', 'Viikari-Juntura E', 'Shiri R'], title: 'Carpal tunnel release: lifetime prevalence, annual incidence, and risk factors', journal: 'Muscle Nerve', year: 2018, volume: '58', issue: '4', pages: '497-502', doi: '10.1002/mus.26145', pubType: 'journal' },
  // 4
  { slug: 'aaos-cts-cpg-2024', authors: ['American Academy of Orthopaedic Surgeons'], title: 'Management of Carpal Tunnel Syndrome — Evidence-Based Clinical Practice Guideline', journal: 'AAOS', year: 2024, url: 'https://www.aaos.org/cts2cpg', pubType: 'guideline', publisher: 'American Academy of Orthopaedic Surgeons' },
  // 5
  { slug: 'shiri-2015-bmi-meta', authors: ['Shiri R', 'Pourmemari MH', 'Falah-Hassani K', 'Viikari-Juntura E'], title: 'The effect of excess body mass on the risk of carpal tunnel syndrome: a meta-analysis of 58 studies', journal: 'Obes Rev', year: 2015, volume: '16', issue: '12', pages: '1094-1104', doi: '10.1111/obr.12324', pubType: 'journal' },
  // 6
  { slug: 'pourmemari-2016-diabetes', authors: ['Pourmemari MH', 'Shiri R'], title: 'Diabetes as a risk factor for carpal tunnel syndrome: a systematic review and meta-analysis', journal: 'Diabet Med', year: 2016, volume: '33', issue: '1', pages: '10-16', doi: '10.1111/dme.12855', pubType: 'journal' },
  // 7
  { slug: 'padua-2002-pregnancy', authors: ['Padua L', 'Aprile I', 'Caliandro P', 'Mondelli M', 'Pasqualetti P', 'Tonali PA'], title: 'Carpal tunnel syndrome in pregnancy: multiperspective follow-up of untreated cases', journal: 'Neurology', year: 2002, volume: '59', issue: '10', pages: '1643-1646', doi: '10.1212/01.wnl.0000034764.80136.ef', pubType: 'journal' },
  // 8
  { slug: 'donnelly-2019-cts-amyloid', authors: ['Donnelly JP', 'Hanna M', 'Sperry BW', 'Seitz WH Jr'], title: 'Carpal tunnel syndrome: a potential early, red-flag sign of amyloidosis', journal: 'J Hand Surg Am', year: 2019, volume: '44', issue: '10', pages: '868-876', doi: '10.1016/j.jhsa.2019.06.016', pubType: 'journal' },
  // 9
  { slug: 'lundborg-1992-pathophys', authors: ['Lundborg G', 'Dahlin LB'], title: 'The pathophysiology of nerve compression', journal: 'Hand Clin', year: 1992, volume: '8', issue: '2', pages: '215-227', pubType: 'journal' },
  // 10
  { slug: 'ettema-2004-ssct', authors: ['Ettema AM', 'Amadio PC', 'Zhao C', 'Wold LE', 'An KN'], title: 'A histological and immunohistochemical study of the subsynovial connective tissue in idiopathic carpal tunnel syndrome', journal: 'J Bone Joint Surg Am', year: 2004, volume: '86', issue: '7', pages: '1458-1466', doi: '10.2106/00004623-200407000-00014', pubType: 'journal' },
  // 11
  { slug: 'werthel-2014-ssct', authors: ['Werthel JD', 'Zhao C', 'An KN', 'Amadio PC'], title: 'Carpal tunnel syndrome pathophysiology: role of subsynovial connective tissue', journal: 'J Wrist Surg', year: 2014, volume: '3', issue: '4', pages: '220-226', doi: '10.1055/s-0034-1394133', pubType: 'journal' },
  // 12
  { slug: 'sandy-hindmarch-2024-tcells', authors: ['Sandy-Hindmarch O', 'Molina-Alvarez M', 'Wiberg A', 'Furniss D', 'Schmid AB'], title: 'Higher densities of T-lymphocytes in the subsynovial connective tissue of people with carpal tunnel syndrome', journal: 'PLoS One', year: 2024, volume: '19', issue: '3', pages: 'e0300046', doi: '10.1371/journal.pone.0300046', pubType: 'journal' },
  // 13
  { slug: 'lanz-1977-anatomy', authors: ['Lanz U'], title: 'Anatomical variations of the median nerve in the carpal tunnel', journal: 'J Hand Surg Am', year: 1977, volume: '2', issue: '1', pages: '44-53', doi: '10.1016/s0363-5023(77)80009-9', pubType: 'journal' },
  // 14
  { slug: 'henry-2015-anatomy-meta', authors: ['Henry BM', 'Zwinczewska H', 'Roy J'], title: 'The prevalence of anatomical variations of the median nerve in the carpal tunnel: a systematic review and meta-analysis', journal: 'PLoS One', year: 2015, volume: '10', issue: '8', pages: 'e0136477', doi: '10.1371/journal.pone.0136477', pubType: 'journal' },
  // 15
  { slug: 'stancic-1999-berrettini', authors: ['Stancić MF', 'Mićović V', 'Potočnjak M'], title: 'The anatomy of the Berrettini branch: implications for carpal tunnel release', journal: 'J Neurosurg', year: 1999, volume: '91', issue: '6', pages: '1027-1030', doi: '10.3171/jns.1999.91.6.1027', pubType: 'journal' },
  // 16
  { slug: 'kaiser-2024-mini-invasive', authors: ['Kaiser P', 'Schmidle G', 'Bode S'], title: 'Clinical-applied anatomy of the carpal tunnel regarding mini-invasive carpal tunnel release', journal: 'Arch Orthop Trauma Surg', year: 2024, volume: '144', issue: '11', pages: '4851-4861', doi: '10.1007/s00402-024-05560-7', pubType: 'journal' },
  // 17
  { slug: 'walker-2013-bifid-pma', authors: ['Walker FO', 'Cartwright MS', 'Blocker JN'], title: 'Prevalence of bifid median nerves and persistent median arteries and their association with carpal tunnel syndrome', journal: 'Muscle Nerve', year: 2013, volume: '48', issue: '4', pages: '539-544', doi: '10.1002/mus.23797', pubType: 'journal' },
  // 18
  { slug: 'ozdag-2023-provocative-meta', authors: ['Ozdag Y', 'Hu Y', 'Hayes DS'], title: 'Sensitivity and specificity of examination maneuvers for carpal tunnel syndrome: a meta-analysis', journal: 'Cureus', year: 2023, volume: '15', issue: '7', pages: 'e42383', doi: '10.7759/cureus.42383', pubType: 'journal' },
  // 19
  { slug: 'cheng-2008-scratch-collapse', authors: ['Cheng CJ', 'Mackinnon-Patterson B', 'Beck JL', 'Mackinnon SE'], title: 'Scratch collapse test for evaluation of carpal and cubital tunnel syndrome', journal: 'J Hand Surg Am', year: 2008, volume: '33', issue: '9', pages: '1518-1524', doi: '10.1016/j.jhsa.2008.05.022', pubType: 'journal' },
  // 20
  { slug: 'graham-2006-cts6', authors: ['Graham B', 'Regehr G', 'Naglie G', 'Wright JG'], title: 'Development and validation of diagnostic criteria for carpal tunnel syndrome', journal: 'J Hand Surg Am', year: 2006, volume: '31', issue: '6', pages: '919-924', doi: '10.1016/j.jhsa.2006.03.005', pubType: 'journal' },
  // 21
  { slug: 'shapiro-2025-aaos-summary', authors: ['Shapiro LM', 'Kamal RN'], title: 'American Academy of Orthopaedic Surgeons/ASSH Clinical Practice Guideline Summary: Management of Carpal Tunnel Syndrome', journal: 'J Am Acad Orthop Surg', year: 2025, volume: '33', issue: '7', pages: 'e356-e366', doi: '10.5435/JAAOS-D-24-01179', pubType: 'journal' },
  // 22
  { slug: 'padua-2023-updated-evidence', authors: ['Padua L', 'Cuccagna C', 'Giovannini S'], title: 'Carpal tunnel syndrome: updated evidence and new questions', journal: 'Lancet Neurol', year: 2023, volume: '22', issue: '3', pages: '255-267', doi: '10.1016/S1474-4422(22)00432-X', pubType: 'journal' },
  // 23
  { slug: 'dekleermaeker-2019-mcid', authors: ['De Kleermaeker FGCM', 'Boogaarts HD', 'Meulstee J', 'Verhagen WIM'], title: 'Minimal clinically important difference for the Boston Carpal Tunnel Questionnaire', journal: 'J Hand Surg Eur Vol', year: 2019, volume: '44', issue: '3', pages: '283-289', doi: '10.1177/1753193418812616', pubType: 'journal' },
  // 24
  { slug: 'ozer-2013-mcid-diabetic', authors: ['Ozer K', 'Malay S', 'Toker S', 'Chung KC'], title: 'Minimal clinically important difference of carpal tunnel release in diabetic and nondiabetic patients', journal: 'Plast Reconstr Surg', year: 2013, volume: '131', issue: '6', pages: '1279-1285', doi: '10.1097/PRS.0b013e31828bd6ec', pubType: 'journal' },
  // 25
  { slug: 'mollestam-2022-symptoms', authors: ['Möllestam K', 'Rosales RS', 'Lyrén PE', 'Atroshi I'], title: 'Measuring symptoms severity in carpal tunnel syndrome', journal: 'Qual Life Res', year: 2022, volume: '31', issue: '5', pages: '1553-1560', doi: '10.1007/s11136-021-03039-1', pubType: 'journal' },
  // 26
  { slug: 'jablecki-2002-electrodiagnostic', authors: ['Jablecki CK', 'Andary MT', 'Floeter MK'], title: 'Practice parameter: electrodiagnostic studies in carpal tunnel syndrome', journal: 'Neurology', year: 2002, volume: '58', issue: '11', pages: '1589-1592', doi: '10.1212/wnl.58.11.1589', pubType: 'journal' },
  // 27
  { slug: 'padua-1997-classification', authors: ['Padua L', 'LoMonaco M', 'Gregori B', 'Valente EM', 'Padua R', 'Tonali P'], title: 'Neurophysiological classification and sensitivity in 500 carpal tunnel syndrome hands', journal: 'Acta Neurol Scand', year: 1997, volume: '96', issue: '4', pages: '211-217', doi: '10.1111/j.1600-0404.1997.tb00271.x', pubType: 'journal' },
  // 28
  { slug: 'tai-2012-ultrasound-meta', authors: ['Tai TW', 'Wu CY', 'Su FC', 'Chern TC', 'Jou IM'], title: 'Ultrasonography for diagnosing carpal tunnel syndrome: a meta-analysis of diagnostic test accuracy', journal: 'Ultrasound Med Biol', year: 2012, volume: '38', issue: '7', pages: '1121-1128', doi: '10.1016/j.ultrasmedbio.2012.02.026', pubType: 'journal' },
  // 29
  { slug: 'miller-2024-us-vs-eds', authors: ['Miller LE', 'Hammert WC', 'Rekant MS', 'Fowler JR'], title: 'Diagnostic accuracy of neuromuscular ultrasound vs. electrodiagnostic studies for carpal tunnel syndrome', journal: 'Hand (N Y)', year: 2024, volume: '20', issue: '8', pages: '1182-1189', doi: '10.1177/15589447241278972', pubType: 'journal' },
  // 30
  { slug: 'roll-2023-csa-reference', authors: ['Roll SC', 'Takata SC', 'Yao B', 'Kysh L', 'Mack WJ'], title: 'Sonographic reference values for median nerve cross-sectional area: a meta-analysis', journal: 'J Diagn Med Sonogr', year: 2023, volume: '39', issue: '5', pages: '492-506', doi: '10.1177/87564793231176009', pubType: 'journal' },
  // 31
  { slug: 'pelosi-2022-consensus', authors: ['Pelosi L', 'Arányi Z', 'Beekman R'], title: 'Expert consensus on the combined investigation of carpal tunnel syndrome with electrodiagnostic tests and neuromuscular ultrasound', journal: 'Clin Neurophysiol', year: 2022, volume: '135', pages: '107-116', doi: '10.1016/j.clinph.2021.12.012', pubType: 'journal' },
  // 32
  { slug: 'karjalainen-2023-cochrane-splint', authors: ['Karjalainen TV', 'Lusa V', 'Page MJ', "O'Connor D", 'Massy-Westropp N', 'Peters SE'], title: 'Splinting for carpal tunnel syndrome', journal: 'Cochrane Database Syst Rev', year: 2023, volume: '2', issue: '2', pages: 'CD010003', doi: '10.1002/14651858.CD010003.pub2', pubType: 'journal' },
  // 33
  { slug: 'atroshi-2013-methylpred-rct', authors: ['Atroshi I', 'Flondell M', 'Hofer M', 'Ranstam J'], title: 'Methylprednisolone injections for the carpal tunnel syndrome: a randomized, placebo-controlled trial', journal: 'Ann Intern Med', year: 2013, volume: '159', issue: '5', pages: '309-317', doi: '10.7326/0003-4819-159-5-201309030-00004', pubType: 'journal' },
  // 34
  { slug: 'hofer-2021-extended-followup', authors: ['Hofer M', 'Ranstam J', 'Atroshi I'], title: 'Extended follow-up of local steroid injection for carpal tunnel syndrome: a randomized clinical trial', journal: 'JAMA Netw Open', year: 2021, volume: '4', issue: '10', pages: 'e2130753', doi: '10.1001/jamanetworkopen.2021.30753', pubType: 'journal' },
  // 35
  { slug: 'chesterton-2018-instincts', authors: ['Chesterton LS', 'Blagojevic-Bucknall M', 'Burton C'], title: 'The clinical and cost-effectiveness of corticosteroid injection versus night splints for carpal tunnel syndrome (INSTINCTS trial)', journal: 'Lancet', year: 2018, volume: '392', issue: '10156', pages: '1423-1433', doi: '10.1016/S0140-6736(18)31572-1', pubType: 'journal' },
  // 36
  { slug: 'lypen-2005-surgery-vs-injection', authors: ['Ly-Pen D', 'Andréu JL', 'de Blas G', 'Sánchez-Olaso A', 'Millán I'], title: 'Surgical decompression versus local steroid injection in carpal tunnel syndrome', journal: 'Arthritis Rheum', year: 2005, volume: '52', issue: '2', pages: '612-619', doi: '10.1002/art.20767', pubType: 'journal' },
  // 37
  { slug: 'yang-2021-us-injection-meta', authors: ['Yang FA', 'Shih YC', 'Hong JP', 'Wu CW', 'Liao CD', 'Chen HC'], title: 'Ultrasound-guided corticosteroid injection for patients with carpal tunnel syndrome: a systematic review and meta-analysis', journal: 'Sci Rep', year: 2021, volume: '11', issue: '1', pages: '10417', doi: '10.1038/s41598-021-89898-7', pubType: 'journal' },
  // 38
  { slug: 'lee-1996-mini-incision', authors: ['Lee WP', 'Plancher KD', 'Strickland JW'], title: 'Carpal tunnel release with a small palmar incision', journal: 'Hand Clin', year: 1996, volume: '12', issue: '2', pages: '271-284', pubType: 'journal' },
  // 39
  { slug: 'vasiliadis-2014-endoscopic-cochrane', authors: ['Vasiliadis HS', 'Georgoulas P', 'Shrier I', 'Salanti G', 'Scholten RJPM'], title: 'Endoscopic release for carpal tunnel syndrome', journal: 'Cochrane Database Syst Rev', year: 2014, issue: '1', pages: 'CD008265', doi: '10.1002/14651858.CD008265.pub2', pubType: 'journal' },
  // 40
  { slug: 'atroshi-2015-jama-followup', authors: ['Atroshi I', 'Hofer M', 'Larsson GU', 'Ranstam J'], title: 'Extended follow-up of a randomized clinical trial of open vs endoscopic release surgery for carpal tunnel syndrome', journal: 'JAMA', year: 2015, volume: '314', issue: '13', pages: '1399-1401', doi: '10.1001/jama.2015.12208', pubType: 'journal' },
  // 41
  { slug: 'petrover-2017-percutaneous', authors: ['Petrover D', 'Silvera J', 'De Baere T', 'Vigan M', 'Hakimé A'], title: 'Percutaneous ultrasound-guided carpal tunnel release: study upon clinical efficacy and safety', journal: 'Cardiovasc Intervent Radiol', year: 2017, volume: '40', issue: '4', pages: '568-575', doi: '10.1007/s00270-016-1545-5', pubType: 'journal' },
  // 42
  { slug: 'moungondo-2024-sono', authors: ['Moungondo F', 'Boushnak MO', 'Schuind F'], title: 'Percutaneous ultrasound-assisted carpal tunnel release using Sono-Instruments', journal: 'Cureus', year: 2024, volume: '16', issue: '8', pages: 'e66899', doi: '10.7759/cureus.66899', pubType: 'journal' },
  // 43
  { slug: 'kim-2024-tctr-long-term', authors: ['Kim IJ', 'Kim JM'], title: 'Long-term outcomes of ultrasound-guided thread carpal tunnel release', journal: 'J Clin Med', year: 2024, volume: '13', issue: '1', pages: '262', doi: '10.3390/jcm13010262', pubType: 'journal' },
  // 44
  { slug: 'ulusoy-2025-uctr-vs-mini', authors: ['Ulusoy İ', 'Yılmaz M', 'Tantekin MF', 'Güzel İ', 'Kıvrak A'], title: 'Ultrasound-guided percutaneous release and mini-open surgery in carpal tunnel syndrome', journal: 'Medicina (Kaunas)', year: 2025, volume: '61', issue: '5', pages: '799', doi: '10.3390/medicina61050799', pubType: 'journal' },
  // 45
  { slug: 'mackinnon-1991-internal-neurolysis', authors: ['Mackinnon SE', 'McCabe S', 'Murray JF'], title: 'Internal neurolysis fails to improve the results of primary carpal tunnel decompression', journal: 'J Hand Surg Am', year: 1991, volume: '16', issue: '2', pages: '211-218', doi: '10.1016/s0363-5023(10)80099-1', pubType: 'journal' },
  // 46
  { slug: 'lalonde-2021-walant-book', authors: ['Lalonde DH'], title: 'Wide Awake Hand Surgery and Therapy Tips', journal: 'Thieme', year: 2021, pubType: 'book', publisher: 'Thieme' },
  // 47
  { slug: 'leblanc-2011-field-sterility', authors: ['Leblanc MR', 'Lalonde DH', 'Thoma A'], title: 'Is main operating room sterility really necessary in carpal tunnel surgery?', journal: 'Hand (N Y)', year: 2011, volume: '6', issue: '1', pages: '60-63', doi: '10.1007/s11552-010-9301-9', pubType: 'journal' },
  // 48
  { slug: 'vonbergen-2023-surgeon-rtw', authors: ['von Bergen TN', 'Reid R', 'Delarosa M', 'Gaul J', 'Chadderdon C'], title: "Surgeons' recommendations for return to work after carpal tunnel release", journal: 'Hand (N Y)', year: 2023, volume: '18', issue: '1_suppl', pages: '100S-105S', doi: '10.1177/15589447221085700', pubType: 'journal' },
  // 49
  { slug: 'wu-2023-monocryl-vs-nylon-eu', authors: ['Wu E', 'Allen R', 'Bayne C', 'Szabo R'], title: 'Prospective randomized controlled trial comparing the effect of Monocryl versus nylon sutures on patient- and observer-assessed outcomes following carpal tunnel surgery', journal: 'J Hand Surg Eur Vol', year: 2023, volume: '48', issue: '10', pages: '1014-1021', doi: '10.1177/17531934231178383', pubType: 'journal' },
  // 50
  { slug: 'miller-2023-rtw-meta', authors: ['Miller LE', 'Chung KC'], title: 'Determinants of return to activity and work after carpal tunnel release: a systematic review and meta-analysis', journal: 'Expert Rev Med Devices', year: 2023, volume: '20', issue: '5', pages: '417-425', doi: '10.1080/17434440.2023.2195549', pubType: 'journal' },
  // 51
  { slug: 'shields-2023-iatrogenic', authors: ['Shields LBE', 'Iyer VG', 'Zhang YP', 'Shields CB'], title: 'Iatrogenic median and ulnar nerve injuries during carpal tunnel release', journal: 'J Neurosurg Case Lessons', year: 2023, volume: '5', issue: '10', pages: 'CASE22543', doi: '10.3171/CASE22543', pubType: 'journal' },
  // 52
  { slug: 'boeckstyns-1999-endoscopic-comp', authors: ['Boeckstyns ME', 'Sørensen AI'], title: 'Does endoscopic carpal tunnel release have a higher rate of complications than open carpal tunnel release?', journal: 'J Hand Surg Br', year: 1999, volume: '24', issue: '1', pages: '9-15', doi: '10.1016/s0266-7681(99)90009-8', pubType: 'journal' },
  // 53
  { slug: 'kumar-2024-pillar-pain-meta', authors: ['Kumar AA', 'Lawson-Smith M'], title: 'Pillar pain after minimally invasive and standard open carpal tunnel release: a systematic review and meta-analysis', journal: 'J Hand Surg Glob Online', year: 2024, volume: '6', issue: '2', pages: '212-221', doi: '10.1016/j.jhsg.2023.12.003', pubType: 'journal' },
  // 54
  { slug: 'rellan-2025-pillar-walant', authors: ['Rellan I', 'Donndorff AG', 'Gallucci GL'], title: 'Pillar pain incidence, duration, and psychological correlations in WALANT. A prospective study of 170 patients', journal: 'J Hand Microsurg', year: 2025, volume: '17', issue: '2', pages: '100177', doi: '10.1016/j.jham.2024.100177', pubType: 'journal' },
  // 55
  { slug: 'pripotnev-2022-revision', authors: ['Pripotnev S', 'Mackinnon SE'], title: 'Revision of carpal tunnel surgery', journal: 'J Clin Med', year: 2022, volume: '11', issue: '5', pages: '1386', doi: '10.3390/jcm11051386', pubType: 'journal' },
  // 56
  { slug: 'akrivos-2025-hypothenar-flap', authors: ['Akrivos VS', 'Athanaselis ED', 'Stefanou N', 'Koutalos AA', 'Dailiana ZH', 'Varitimidis SE'], title: 'Effectiveness of the hypothenar fat pad flap in revision surgery for recurrence of carpal tunnel syndrome', journal: 'J Hand Surg Eur Vol', year: 2025, doi: '10.1177/17531934251342726', pubType: 'journal' },
  // 57
  { slug: 'deroo-2024-flap-review', authors: ['de Roo MGA', 'Muller HG', 'Walbeehm ET'], title: 'Does a hypothenar fat pad flap procedure provide an added value over an open carpal tunnel release in revision surgery for patients with recurrent carpal tunnel syndrome?', journal: 'Hand Surg Rehabil', year: 2024, doi: '10.1016/j.hansur.2024.101791', pubType: 'journal' },
];

// =============================================================================
//  Sanity helpers (reference + glossary resolution)
// =============================================================================

async function ensureBibReferences(refs: RefSeed[]): Promise<Record<number, string>> {
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
    if (ref.doi && byDoi.has(ref.doi)) id = byDoi.get(ref.doi);
    else {
      const candidateId = `bibref-${ref.slug}`;
      const direct = await client.getDocument(candidateId);
      if (direct) id = candidateId;
      else {
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
    if (!found.has(id))
      throw new Error(
        `Glossary slug ${slug} not in Sanity. Run update-glossary-pl-cts.ts (and seed-cts-pl-procedure.ts for any new slugs) first.`,
      );
    out[slug] = id;
  }
  return out;
}

// =============================================================================
//  Patient article seed
// =============================================================================

async function seedPatient() {
  const path = resolve(
    INBOX_DIR,
    'drgladysz-article-zespol-ciesni-nadgarstka-pacjent-pl-draft-v1_1.md',
  );
  const md = readFileSync(path, 'utf8');
  const lines = md.split(/\r?\n/);

  // Body starts after the second `# Zespół cieśni nadgarstka...` heading
  // (line ~58) and continues until `## Piśmiennictwo`. The standfirst is the
  // blockquote right after the title.
  const titleHeadings = lines
    .map((l, idx) => ({ l, idx }))
    .filter((x) => x.l.startsWith('# Zespół cieśni nadgarstka'));
  const bodyStart = titleHeadings[1]?.idx ?? -1;
  const bibStart = lines.findIndex((l) => l === '## Piśmiennictwo');
  if (bodyStart < 0 || bibStart < 0)
    throw new Error('Could not locate patient article body markers.');

  // Standfirst is the first `> *...*` block after title
  let standfirst = '';
  for (let i = bodyStart + 1; i < bibStart; i++) {
    const t = lines[i].trim();
    if (t.startsWith('> *')) {
      const m = t.match(/^>\s+\*([^*]+)\*\s*$/);
      if (m) {
        standfirst = m[1];
        break;
      }
    }
  }

  // Body lines: from after `---\n\n[paragraph 1]` to `---\n## Piśmiennictwo`.
  // Skip the meta block (Kategoria/Autor/Opublikowano lines) bounded by the
  // first `---`.
  let i = bodyStart + 1;
  // skip standfirst quote
  while (i < bibStart && !lines[i].startsWith('**Kategoria')) i++;
  // skip the meta block until first horizontal rule
  while (i < bibStart && !lines[i].startsWith('---')) i++;
  i++; // step over the rule
  // body proper
  const bodyLines: string[] = [];
  while (i < bibStart) {
    bodyLines.push(lines[i]);
    i++;
  }
  // Drop trailing rule
  while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '---')
    bodyLines.pop();

  const allText = bodyLines.join('\n');
  const glossarySlugs = extractGlossarySlugs(allText);

  console.log('Patient article: ensuring refs + glossary...');
  const citationByPosition = await ensureBibReferences(PATIENT_REFS);
  const glossaryIds = await ensureGlossaryIds(glossarySlugs);
  const ctx: ResolverContext = { citationByPosition, glossaryIds };

  const body = parseSection(bodyLines, ctx);

  const doc = {
    _id: 'article-zespol-ciesni-nadgarstka',
    _type: 'article',
    title: 'Zespół cieśni nadgarstka — przewodnik dla pacjentów',
    slug: { _type: 'slug', current: 'zespol-ciesni-nadgarstka' },
    category: 'patient',
    language: 'pl',
    audience: 'patient',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    publishedDate: '2026-05-03',
    lastUpdated: '2026-05-03',
    excerpt:
      'Zespół cieśni nadgarstka — przewodnik dla pacjentów. Objawy, diagnostyka, leczenie zachowawcze i operacyjne, przebieg rekonwalescencji.',
    standfirst,
    body,
    relatedProcedures: [
      {
        _type: 'reference',
        _key: k(),
        _ref: 'procedure-zespol-ciesni-nadgarstka',
        _weak: true,
      },
    ],
    seoTitle:
      'Zespół cieśni nadgarstka — objawy, diagnostyka, leczenie — dr Mateusz Gładysz',
    seoDescription:
      'Zespół cieśni nadgarstka — przewodnik dla pacjentów. Objawy, diagnostyka, leczenie zachowawcze i operacyjne, przebieg rekonwalescencji.',
  };
  await client.createOrReplace(doc);
  console.log('  ✓ article-zespol-ciesni-nadgarstka');
}

// =============================================================================
//  Expert article seed
// =============================================================================

async function seedExpert() {
  const path = resolve(
    INBOX_DIR,
    'drgladysz-article-zespol-ciesni-nadgarstka-ekspercki-pl-draft-v1_1.md',
  );
  const md = readFileSync(path, 'utf8');
  const lines = md.split(/\r?\n/);

  // Title appears twice (once at top, once for body)
  const titleHeadings = lines
    .map((l, idx) => ({ l, idx }))
    .filter((x) => x.l === '# Zespół cieśni nadgarstka — przegląd kliniczny');
  const bodyStart = titleHeadings[0]?.idx ?? -1;
  const bibStart = lines.findIndex((l) => l === '## Piśmiennictwo');
  if (bodyStart < 0 || bibStart < 0)
    throw new Error('Could not locate expert article body markers.');

  // Standfirst from `> *...*`
  let standfirst = '';
  for (let i = bodyStart + 1; i < bibStart; i++) {
    const t = lines[i].trim();
    const m = t.match(/^>\s+\*([^*]+)\*\s*$/);
    if (m) {
      standfirst = m[1];
      break;
    }
  }

  // Key Points: section `## Punkty kluczowe`
  const kpStart = lines.findIndex((l) => l === '## Punkty kluczowe');
  const keyPoints = { question: '', findings: '', meaning: '' };
  if (kpStart >= 0) {
    let i = kpStart + 1;
    let current: 'question' | 'findings' | 'meaning' | '' = '';
    while (i < bibStart && !lines[i].startsWith('---')) {
      const t = lines[i].trim();
      if (t === '**Pytanie**') current = 'question';
      else if (t === '**Wnioski**') current = 'findings';
      else if (t === '**Znaczenie**') current = 'meaning';
      else if (t && current) keyPoints[current] += (keyPoints[current] ? ' ' : '') + t;
      i++;
    }
  }

  // Body: after the `## Punkty kluczowe` block's closing `---` until
  // `## Piśmiennictwo`. We skip the meta lines (Kategoria/Autor/...) that
  // appear right after the standfirst.
  let i = kpStart >= 0 ? kpStart + 1 : bodyStart + 1;
  // Skip past the closing `---` after Punkty kluczowe
  while (i < bibStart && !lines[i].startsWith('---')) i++;
  i++;
  const bodyLines: string[] = [];
  while (i < bibStart) {
    bodyLines.push(lines[i]);
    i++;
  }

  const allText = bodyLines.join('\n');
  const glossarySlugs = extractGlossarySlugs(allText);

  console.log('Expert article: ensuring refs + glossary...');
  const citationByPosition = await ensureBibReferences(EXPERT_REFS);
  const glossaryIds = await ensureGlossaryIds(glossarySlugs);
  const ctx: ResolverContext = { citationByPosition, glossaryIds };

  const body = parseSection(bodyLines, ctx);

  const doc = {
    _id: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny',
    _type: 'article',
    title: 'Zespół cieśni nadgarstka — przegląd kliniczny',
    slug: { _type: 'slug', current: 'zespol-ciesni-nadgarstka-przeglad-kliniczny' },
    category: 'expert',
    language: 'pl',
    audience: 'peer',
    author: { _type: 'reference', _ref: AUTHOR_ID },
    publishedDate: '2026-05-03',
    lastUpdated: '2026-05-03',
    excerpt:
      'Współczesna synteza zespołu cieśni nadgarstka: anatomia, wytyczne AAOS 2024, kontrowersje chirurgiczne, diagnostyka choroby nawrotowej. Artykuł ekspercki dla chirurgii ręki.',
    standfirst,
    keyPoints,
    body,
    relatedProcedures: [
      {
        _type: 'reference',
        _key: k(),
        _ref: 'procedure-zespol-ciesni-nadgarstka',
        _weak: true,
      },
    ],
    relatedArticles: [
      {
        _type: 'reference',
        _key: k(),
        _ref: 'article-zespol-ciesni-nadgarstka',
        _weak: true,
      },
    ],
    seoTitle:
      'Zespół cieśni nadgarstka — przegląd kliniczny — dr Mateusz Gładysz',
    seoDescription:
      'Współczesna synteza zespołu cieśni nadgarstka: anatomia, wytyczne AAOS 2024, kontrowersje chirurgiczne, diagnostyka choroby nawrotowej.',
  };
  await client.createOrReplace(doc);
  console.log('  ✓ article-zespol-ciesni-nadgarstka-przeglad-kliniczny');
}

// =============================================================================
//  Entry point
// =============================================================================

async function main() {
  const cmd = process.argv[2] || 'both';
  if (cmd === 'patient' || cmd === 'both') await seedPatient();
  if (cmd === 'expert' || cmd === 'both') await seedExpert();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
