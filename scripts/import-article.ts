// site/scripts/import-article.ts
//
// Generalized importer for v1.7-package expert articles. Reads the 4 package
// files at 01-brand-system/articles/{folder}/ (02-article-body.md,
// 03-article-metadata.yaml, 04-references.yaml, 05-glossary-terms.yaml) and
// emits a single JSON file with three arrays — bibReferences[],
// glossaryTerms[], articles[] — ready to be handed to seed-article.ts.
//
// PURE: this script does not call Sanity. Deterministic markdown→JSON
// converter. Re-running with the same inputs produces byte-identical output.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types scripts/import-article.ts <folder> > scripts/.{folder}-import.json
//
// where <folder> is the directory name under 01-brand-system/articles/, e.g.
// "scaphoid-fracture", "extensor-tendon", "flexor-tendon".

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const folder = process.argv[2];
if (!folder) {
  console.error(
    'Usage: node --experimental-strip-types scripts/import-article.ts <folder>',
  );
  process.exit(1);
}

const PACKAGE_DIR = resolve(
  __dirname,
  `../../01-brand-system/articles/${folder}`,
);

// The Phase 5 author doc was seeded with a UUID _id rather than the slug-form
// 'mateusz-gladysz' the YAML metadata expects. Translate at import time so
// the article's author reference points at the live document.
const AUTHOR_ID_MAP: Record<string, string> = {
  'mateusz-gladysz': '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472',
};

type Span = {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
};

type MarkDef = {
  _type: 'citation' | 'glossaryTerm';
  _key: string;
  reference?: { _type: 'reference'; _ref: string };
  term?: { _type: 'reference'; _ref: string };
};

type Block = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h2';
  markDefs: MarkDef[];
  children: Span[];
};

function readPackageFile(name: string): string {
  return readFileSync(resolve(PACKAGE_DIR, name), 'utf8');
}

function readYaml<T>(name: string): T {
  return yaml.load(readPackageFile(name)) as T;
}

function stripAuthoringHeader(md: string): string {
  const lines = md.split('\n');
  let separatorCount = 0;
  let bodyStartIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++;
      if (separatorCount === 2) {
        bodyStartIdx = i + 1;
        break;
      }
    }
  }
  return lines.slice(bodyStartIdx).join('\n').trimStart();
}

function paragraphize(body: string): string[] {
  const lines = body.split('\n');
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        paragraphs.push(current.join(' ').trim());
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) paragraphs.push(current.join(' ').trim());
  return paragraphs.filter((p) => p.length > 0);
}

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'em'; value: string }
  | { type: 'ref'; slug: string }
  | { type: 'gloss'; slug: string; displayed: string };

const TOKEN_PATTERNS: Array<{
  regex: RegExp;
  build: (m: RegExpMatchArray) => InlineToken;
}> = [
  {
    regex: /^\*([^*\n]+)\*/,
    build: (m) => ({ type: 'em', value: m[1] }),
  },
  {
    regex: /^\[ref:([a-z0-9-]+)\]/,
    build: (m) => ({ type: 'ref', slug: m[1] }),
  },
  {
    regex: /^\[gloss:([a-z0-9-]+)\|([^\]]+)\]/,
    build: (m) => ({ type: 'gloss', slug: m[1], displayed: m[2] }),
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

let _spanCounter = 0;
const nextSpanKey = () => `s${++_spanCounter}`;

let _markCounter = 0;
const nextMarkKey = (prefix: 'c' | 'g') => `${prefix}${++_markCounter}`;

let _blockCounter = 0;
const nextBlockKey = () => `b${++_blockCounter}`;

function tokensToBlock(
  tokens: InlineToken[],
  glossarySlugs: Set<string>,
  refSlugs: Set<string>,
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
    } else if (tok.type === 'gloss') {
      if (!glossarySlugs.has(tok.slug)) {
        throw new Error(
          `[gloss:${tok.slug}|...] references unknown glossary slug`,
        );
      }
      flushText();
      const markKey = nextMarkKey('g');
      markDefs.push({
        _type: 'glossaryTerm',
        _key: markKey,
        term: { _type: 'reference', _ref: glossaryDocId(tok.slug) },
      });
      children.push({
        _type: 'span',
        _key: nextSpanKey(),
        text: tok.displayed,
        marks: [markKey],
      });
    } else if (tok.type === 'ref') {
      if (!refSlugs.has(tok.slug)) {
        throw new Error(`[ref:${tok.slug}] references unknown reference slug`);
      }
      const markKey = nextMarkKey('c');
      markDefs.push({
        _type: 'citation',
        _key: markKey,
        reference: { _type: 'reference', _ref: tok.slug },
      });

      if (pendingText) {
        const trimmed = pendingText.replace(/\s+$/, '');
        if (trimmed) {
          children.push({
            _type: 'span',
            _key: nextSpanKey(),
            text: trimmed,
            marks: [markKey],
          });
        } else {
          const last = children[children.length - 1];
          if (last) {
            last.marks = [...last.marks, markKey];
          }
        }
        pendingText = '';
      } else {
        const last = children[children.length - 1];
        if (last) {
          last.marks = [...last.marks, markKey];
        }
      }
    }
  }

  flushText();
  return { children, markDefs };
}

function buildBody(
  bodyMd: string,
  glossarySlugs: Set<string>,
  refSlugs: Set<string>,
): Block[] {
  const stripped = stripAuthoringHeader(bodyMd);
  const paragraphs = paragraphize(stripped);
  const blocks: Block[] = [];
  for (const p of paragraphs) {
    if (p.startsWith('## ')) {
      const headingText = p.slice(3).trim();
      const { children, markDefs } = tokensToBlock(
        tokenizeInline(headingText),
        glossarySlugs,
        refSlugs,
      );
      blocks.push({
        _type: 'block',
        _key: nextBlockKey(),
        style: 'h2',
        markDefs,
        children,
      });
    } else if (p.startsWith('# ')) {
      continue;
    } else if (p.startsWith('#')) {
      throw new Error(
        `Heading level >h2 forbidden by package: "${p.slice(0, 60)}…"`,
      );
    } else if (p.startsWith('- ') || p.startsWith('* ') || /^\d+\.\s/.test(p)) {
      throw new Error(`Lists forbidden by package §6: "${p.slice(0, 60)}…"`);
    } else {
      const { children, markDefs } = tokensToBlock(
        tokenizeInline(p),
        glossarySlugs,
        refSlugs,
      );
      blocks.push({
        _type: 'block',
        _key: nextBlockKey(),
        style: 'normal',
        markDefs,
        children,
      });
    }
  }
  return blocks;
}

type RefYaml = {
  slug: string;
  citationKey?: string;
  referenceType: 'journalArticle' | 'guideline' | 'bookChapter';
  // Some packages (flexor-tendon) use a single comma-separated string for
  // authors; others (scaphoid-fracture, extensor-tendon) use a block list.
  // Normalised to string[] in normaliseAuthors().
  authors?: string[] | string;
  title: string;
  journal?: string;
  journalAbbreviation?: string;
  bookTitle?: string;
  editors?: string[];
  edition?: string;
  publisher?: string;
  location?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  url?: string;
  abstractPreview?: string;
  yearLastReviewed?: number;
  note?: string;
};

const PUB_TYPE_MAP: Record<RefYaml['referenceType'], string> = {
  journalArticle: 'journal',
  guideline: 'guideline',
  bookChapter: 'chapter',
};

function normaliseAuthors(raw: RefYaml['authors']): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter(Boolean);
  // Comma-separated string. Vancouver authors take "Surname GH" form, no
  // periods after initials, so no comma-vs-period ambiguity. Splitting on
  // commas and trimming is safe for this corpus.
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildBibReference(r: RefYaml) {
  const pubType = PUB_TYPE_MAP[r.referenceType];
  if (!pubType) {
    throw new Error(
      `bibReference ${r.slug} has unknown referenceType: ${r.referenceType}`,
    );
  }

  // The schema's `journal` field is required even for chapters and guidelines —
  // its description says "For books, use book title".
  let journalSource: string | undefined;
  if (r.referenceType === 'journalArticle') {
    journalSource = r.journalAbbreviation ?? r.journal;
  } else if (r.referenceType === 'guideline') {
    journalSource = r.publisher ?? r.journal ?? 'Guideline';
  } else if (r.referenceType === 'bookChapter') {
    journalSource = r.bookTitle ?? r.journal;
  }
  if (!journalSource) {
    throw new Error(
      `bibReference ${r.slug} has no journal/publisher/bookTitle source`,
    );
  }

  const isChapter = r.referenceType === 'bookChapter';
  const isGuideline = r.referenceType === 'guideline';

  return {
    _id: r.slug,
    _type: 'bibReference',
    title: r.title,
    authors: normaliseAuthors(r.authors),
    journal: journalSource,
    year: r.year,
    ...(r.volume ? { volume: r.volume } : {}),
    ...(r.issue ? { issue: r.issue } : {}),
    ...(r.pages ? { pages: r.pages } : {}),
    ...(r.pmid ? { pmid: r.pmid } : {}),
    ...(r.pmcid ? { pmcid: r.pmcid } : {}),
    ...(r.doi ? { doi: r.doi } : {}),
    ...(r.url ? { url: r.url } : {}),
    pubType,
    ...(isChapter && r.editors ? { editors: r.editors } : {}),
    ...((isChapter || isGuideline) && r.publisher ? { publisher: r.publisher } : {}),
    // YAML uses `location`; schema field is `publisherLocation`.
    ...((isChapter || isGuideline) && r.location ? { publisherLocation: r.location } : {}),
    ...(isChapter && r.edition ? { edition: r.edition } : {}),
    ...(r.abstractPreview ? { abstractPreview: r.abstractPreview } : {}),
  };
}

type GlossYaml = {
  slug: string;
  term: string;
  termPolish?: string;
  category:
    | 'anatomy'
    | 'condition'
    | 'procedure'
    | 'investigation'
    | 'treatment'
    | 'outcome'
    | 'structure'
    | 'other';
  synonyms?: string[];
  shortDefinition: string;
  fullDefinition?: string;
  relatedTerms?: string[];
  notesForMateusz?: string;
};

function glossaryDocId(slug: string): string {
  return `glossary-${slug}`;
}

function articleDocId(slug: string): string {
  return `article-${slug}`;
}

function procedureDocId(slug: string): string {
  return `procedure-${slug}`;
}

function textToBlocks(text: string, keyPrefix: string): unknown[] {
  if (!text) return [];
  const cleaned = text.trim();
  return [
    {
      _type: 'block',
      _key: `${keyPrefix}-fd`,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: `${keyPrefix}-fd-s1`,
          text: cleaned,
          marks: [],
        },
      ],
    },
  ];
}

// Polish placeholder strings used in the package YAML to flag pending Polish
// composition. Drop them at import time so the field is simply absent on the doc.
const POLISH_PLACEHOLDER_PATTERN = /^\[?\s*pending\s+polish\s+session\s*\]?$/i;

function isRealPolishValue(v: string | undefined): v is string {
  if (!v) return false;
  const trimmed = v.trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === 'null') return false;
  if (POLISH_PLACEHOLDER_PATTERN.test(trimmed)) return false;
  return true;
}

function buildGlossaryTerm(g: GlossYaml) {
  const shortDef = g.shortDefinition.trim();
  if (shortDef.length > 450) {
    throw new Error(
      `glossary ${g.slug} shortDefinition exceeds 450 chars (${shortDef.length})`,
    );
  }
  return {
    _id: glossaryDocId(g.slug),
    _type: 'glossaryTerm',
    term: g.term,
    ...(isRealPolishValue(g.termPolish) ? { termPolish: g.termPolish!.trim() } : {}),
    slug: { _type: 'slug', current: g.slug },
    category: g.category,
    shortDefinition: shortDef,
    ...(g.fullDefinition
      ? { fullDefinition: textToBlocks(g.fullDefinition, glossaryDocId(g.slug)) }
      : {}),
    ...(g.synonyms && g.synonyms.length > 0 ? { synonyms: g.synonyms } : {}),
    ...(g.relatedTerms && g.relatedTerms.length > 0
      ? {
          relatedTerms: g.relatedTerms.map((targetSlug, i) => ({
            _key: `rt-${i}`,
            _type: 'reference',
            _ref: glossaryDocId(targetSlug),
          })),
        }
      : {}),
    ...(g.notesForMateusz ? { notesForMateusz: g.notesForMateusz } : {}),
  };
}

type ArticleMetaYaml = {
  document_type: 'article';
  title: string;
  slug: string;
  category: 'patient' | 'expert' | 'fessh-prep' | 'news';
  audience: 'patient' | 'peer' | 'mixed';
  author: string;
  publishedDate: string;
  lastUpdated: string;
  standfirst: string;
  keyPoints: { question: string; findings: string; meaning: string };
  seoTitle?: string;
  seoDescription?: string;
  heroImage?: string | null;
  bodyMarkdownPath?: string;
  redirectFrom?: string[];
  relatedArticles?: string[];
  relatedProcedures?: string[];
  schemaType?: string;
  schemaSpecialty?: string;
};

// Strip trailing inline-comment patterns leaked from YAML block scalars.
// YAML's `>` (folded) and `|` (literal) scalars do NOT treat `#` as a comment
// marker — text written as a hint by the package author (e.g., "# ≤ 160 chars",
// "# 154 chars (≤160)") gets captured as part of the field value. trimEnd()
// first so the regex anchor lands at the genuine string end (yaml.load may
// return the scalar with a trailing newline).
function stripTrailingYamlComment(s: string): string {
  return s.trimEnd().replace(/\s+#[^\n]*$/, '').trimEnd();
}

function trim(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const cleaned = stripTrailingYamlComment(s);
  const t = cleaned.trim().replace(/\s+/g, ' ');
  return t.length > max ? t.slice(0, max).trimEnd() : t;
}

function deriveExcerpt(meta: ArticleMetaYaml): string {
  // Prefer the explicit SEO description (already authored to ≤160 chars) so
  // the card / SEO summary matches what the editor wrote. Fall back to the
  // standfirst, truncated at 280 with an ellipsis when needed.
  const seoRaw = meta.seoDescription
    ? stripTrailingYamlComment(meta.seoDescription)
    : '';
  const seo = seoRaw.trim().replace(/\s+/g, ' ');
  if (seo) {
    return seo.length > 280 ? seo.slice(0, 277).trimEnd() + '…' : seo;
  }
  const sfRaw = stripTrailingYamlComment(meta.standfirst);
  const sf = sfRaw.trim().replace(/\s+/g, ' ');
  if (sf.length <= 280) return sf;
  return sf.slice(0, 277).trimEnd() + '…';
}

function buildArticle(meta: ArticleMetaYaml, body: Block[]) {
  const standfirst = stripTrailingYamlComment(meta.standfirst)
    .trim()
    .replace(/\s+/g, ' ');
  if (standfirst.length > 600) {
    throw new Error(
      `article standfirst exceeds 600 chars (${standfirst.length}): ${standfirst.slice(0, 60)}…`,
    );
  }
  const excerpt = deriveExcerpt(meta);
  const authorRef = AUTHOR_ID_MAP[meta.author] ?? meta.author;

  const relatedArticleRefs = (meta.relatedArticles ?? []).map((slug, i) => ({
    _key: `ra-${i}`,
    _type: 'reference',
    _ref: articleDocId(slug),
  }));
  const relatedProcedureRefs = (meta.relatedProcedures ?? []).map((slug, i) => ({
    _key: `rp-${i}`,
    _type: 'reference',
    _ref: procedureDocId(slug),
  }));

  return {
    _id: articleDocId(meta.slug),
    _type: 'article',
    title: meta.title,
    slug: { _type: 'slug', current: meta.slug },
    category: meta.category,
    audience: meta.audience,
    author: { _type: 'reference', _ref: authorRef },
    publishedDate: meta.publishedDate,
    lastUpdated: meta.lastUpdated,
    excerpt,
    standfirst,
    keyPoints: {
      question: stripTrailingYamlComment(meta.keyPoints.question)
        .trim()
        .replace(/\s+/g, ' '),
      findings: stripTrailingYamlComment(meta.keyPoints.findings)
        .trim()
        .replace(/\s+/g, ' '),
      meaning: stripTrailingYamlComment(meta.keyPoints.meaning)
        .trim()
        .replace(/\s+/g, ' '),
    },
    body,
    ...(relatedArticleRefs.length > 0 ? { relatedArticles: relatedArticleRefs } : {}),
    ...(relatedProcedureRefs.length > 0 ? { relatedProcedures: relatedProcedureRefs } : {}),
    ...(meta.seoTitle ? { seoTitle: trim(meta.seoTitle, 60) } : {}),
    ...(meta.seoDescription
      ? { seoDescription: trim(meta.seoDescription, 160) }
      : {}),
  };
}

function main() {
  const refsYaml = readYaml<{ references: RefYaml[] }>('04-references.yaml');
  // Glossary YAML root key is inconsistent across packages: scaphoid + flexor
  // use `glossaryTerms` (camelCase), extensor uses `glossary_terms` (snake).
  const glossDoc = readYaml<{
    glossaryTerms?: GlossYaml[];
    glossary_terms?: GlossYaml[];
  }>('05-glossary-terms.yaml');
  const glossList = glossDoc.glossaryTerms ?? glossDoc.glossary_terms ?? [];
  if (glossList.length === 0) {
    throw new Error(
      `No glossary terms found in 05-glossary-terms.yaml (expected key 'glossaryTerms' or 'glossary_terms').`,
    );
  }
  const metaYaml = readYaml<ArticleMetaYaml>('03-article-metadata.yaml');
  const bodyMd = readPackageFile('02-article-body.md');

  const refSlugs = new Set(refsYaml.references.map((r) => r.slug));
  const glossSlugs = new Set(glossList.map((g) => g.slug));

  if (refSlugs.size !== refsYaml.references.length) {
    throw new Error('Duplicate reference slug in 04-references.yaml');
  }
  if (glossSlugs.size !== glossList.length) {
    throw new Error('Duplicate glossary slug in 05-glossary-terms.yaml');
  }

  const body = buildBody(bodyMd, glossSlugs, refSlugs);

  const bibReferences = refsYaml.references.map(buildBibReference);
  const glossaryTerms = glossList.map(buildGlossaryTerm);
  const articles = [buildArticle(metaYaml, body)];

  // RelatedTerms cross-references can point to glossary terms in other
  // articles' packages (which may or may not be seeded yet). We warn here
  // but don't fail — the seed script filters unresolved refs against the
  // live dataset before patching.
  const knownGlossIds = new Set(glossaryTerms.map((g) => g._id));
  const externalRefs: { from: string; to: string }[] = [];
  for (const g of glossaryTerms) {
    const rt = (g as { relatedTerms?: { _ref: string }[] }).relatedTerms;
    if (Array.isArray(rt)) {
      for (const r of rt) {
        if (!knownGlossIds.has(r._ref)) {
          externalRefs.push({ from: g._id, to: r._ref });
        }
      }
    }
  }
  if (externalRefs.length > 0) {
    process.stderr.write(
      `[import-article] ${externalRefs.length} relatedTerms reference(s) point outside this package's glossary — seed script will filter against the live dataset:\n`,
    );
    for (const e of externalRefs) {
      process.stderr.write(`  ${e.from} → ${e.to}\n`);
    }
  }

  const citationCount = body.flatMap((b) =>
    b.markDefs.filter((m) => m._type === 'citation'),
  ).length;
  const glossaryCount = body.flatMap((b) =>
    b.markDefs.filter((m) => m._type === 'glossaryTerm'),
  ).length;
  const blockCount = body.length;

  const out = {
    _meta: {
      generatedAt: new Date().toISOString(),
      source: `01-brand-system/articles/${folder}/`,
      stats: {
        bibReferences: bibReferences.length,
        glossaryTerms: glossaryTerms.length,
        articles: articles.length,
        bodyBlocks: blockCount,
        citationMarks: citationCount,
        glossaryMarks: glossaryCount,
      },
    },
    bibReferences,
    glossaryTerms,
    articles,
  };

  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
