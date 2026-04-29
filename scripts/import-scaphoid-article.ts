// site/scripts/import-scaphoid-article.ts
//
// One-shot importer for the scaphoid-fractures expert article (Phase 6).
// Reads the implementation package at 01-brand-system/articles/scaphoid-fracture/,
// converts the markdown body to Sanity Portable Text, maps the YAML files for
// references, glossary terms, and metadata, and emits a single JSON file with
// three arrays — bibReferences[], glossaryTerms[], articles[] — ready to be
// handed to the Sanity MCP `create_documents_from_json` tool.
//
// PURE: this script does not call Sanity. It is a deterministic markdown→JSON
// converter. Re-running with the same inputs produces byte-identical output.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types scripts/import-scaphoid-article.ts > scripts/.scaphoid-import.json
//
// Conversion rules (from 01-IMPLEMENTATION-README.md §6):
//   * `## Heading` → block style 'h2'. No h3+, no lists allowed.
//   * Paragraph → block style 'normal'.
//   * `*text*` → em decorator on a span.
//   * `[ref:slug]` → citation mark applied to the immediately preceding
//      non-whitespace text. The mark's `_ref` points at the bibReference
//      doc whose _id == slug.
//   * `[gloss:slug|displayed]` → glossaryTerm mark wrapping a span whose
//      text == displayed. The mark's `_ref` points at glossary-{slug}.
//   * Em-dashes `—` (U+2014) pass through verbatim. No smart-quote pass.
//   * The blockquote+separator at the top of the markdown (the authoring
//     notation) is stripped.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_DIR = resolve(
  __dirname,
  '../../01-brand-system/articles/scaphoid-fracture',
);

// The Phase 5 author doc was seeded with a UUID _id rather than the slug-form
// 'mateusz-gladysz' the YAML metadata expects. We translate at import time so
// the article's author reference points at the live document. The metadata
// YAML is authoritative; this map is the only deployment-specific override.
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

/**
 * Strip the authoring notation block at the top of 02-article-body.md.
 * Per README §6: the block at the top is authoring guidance and not part of
 * the published article. The published body begins after the second `---`.
 */
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
  build: (m: RegExpExecArray) => InlineToken;
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
      const m = regex.exec(slice);
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
        // Drop the whitespace immediately before the [ref:...] marker —
        // the markdown convention always inserts a space before the ref,
        // even when the following character is punctuation. Keeping that
        // space produces `word¹ ,` rendering; dropping it yields `word¹,`
        // which matches the citation typography readers expect.
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
  referenceType: 'journalArticle' | 'guideline';
  authors?: string[];
  title: string;
  journal?: string;
  journalAbbreviation?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  url?: string;
  abstractPreview?: string;
  publisher?: string;
  location?: string;
  yearLastReviewed?: number;
  note?: string;
};

const PUB_TYPE_MAP: Record<RefYaml['referenceType'], string> = {
  journalArticle: 'journal',
  guideline: 'guideline',
};

function buildBibReference(r: RefYaml) {
  const pubType = PUB_TYPE_MAP[r.referenceType];
  const journalSource =
    r.referenceType === 'guideline'
      ? (r.publisher ?? r.journal ?? 'Guideline')
      : (r.journalAbbreviation ?? r.journal ?? '');
  if (!journalSource) {
    throw new Error(`bibReference ${r.slug} has no journal/publisher source`);
  }

  return {
    _id: r.slug,
    _type: 'bibReference',
    title: r.title,
    authors: r.authors ?? [],
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

function buildGlossaryTerm(g: GlossYaml) {
  const shortDef = g.shortDefinition.trim();
  if (shortDef.length > 400) {
    throw new Error(
      `glossary ${g.slug} shortDefinition exceeds 400 chars (${shortDef.length})`,
    );
  }
  return {
    _id: glossaryDocId(g.slug),
    _type: 'glossaryTerm',
    term: g.term,
    ...(g.termPolish ? { termPolish: g.termPolish } : {}),
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
  heroImage?: string;
  bodyMarkdownPath?: string;
  redirectFrom?: string[];
  relatedArticles?: string[];
  relatedProcedures?: string[];
  schemaType?: string;
  schemaSpecialty?: string;
};

function trim(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > max ? t.slice(0, max).trimEnd() : t;
}

function buildArticle(meta: ArticleMetaYaml, body: Block[]) {
  const excerpt = meta.standfirst.trim().replace(/\s+/g, ' ');
  if (excerpt.length > 280) {
    throw new Error(
      `article excerpt exceeds 280 chars (${excerpt.length}): ${excerpt.slice(0, 60)}…`,
    );
  }
  const authorRef = AUTHOR_ID_MAP[meta.author] ?? meta.author;
  return {
    _id: `article-${meta.slug}`,
    _type: 'article',
    title: meta.title,
    slug: { _type: 'slug', current: meta.slug },
    category: meta.category,
    audience: meta.audience,
    author: { _type: 'reference', _ref: authorRef },
    publishedDate: meta.publishedDate,
    lastUpdated: meta.lastUpdated,
    excerpt,
    keyPoints: {
      question: meta.keyPoints.question.trim().replace(/\s+/g, ' '),
      findings: meta.keyPoints.findings.trim().replace(/\s+/g, ' '),
      meaning: meta.keyPoints.meaning.trim().replace(/\s+/g, ' '),
    },
    body,
    ...(meta.seoTitle ? { seoTitle: trim(meta.seoTitle, 60) } : {}),
    ...(meta.seoDescription
      ? { seoDescription: trim(meta.seoDescription, 160) }
      : {}),
  };
}

function main() {
  const refsYaml = readYaml<{ references: RefYaml[] }>('04-references.yaml');
  const glossYaml = readYaml<{ glossaryTerms: GlossYaml[] }>(
    '05-glossary-terms.yaml',
  );
  const metaYaml = readYaml<ArticleMetaYaml>('03-article-metadata.yaml');
  const bodyMd = readPackageFile('02-article-body.md');

  const refSlugs = new Set(refsYaml.references.map((r) => r.slug));
  const glossSlugs = new Set(glossYaml.glossaryTerms.map((g) => g.slug));

  if (refSlugs.size !== refsYaml.references.length) {
    throw new Error('Duplicate reference slug in 04-references.yaml');
  }
  if (glossSlugs.size !== glossYaml.glossaryTerms.length) {
    throw new Error('Duplicate glossary slug in 05-glossary-terms.yaml');
  }

  const body = buildBody(bodyMd, glossSlugs, refSlugs);

  const bibReferences = refsYaml.references.map(buildBibReference);
  const glossaryTerms = glossYaml.glossaryTerms.map(buildGlossaryTerm);
  const articles = [buildArticle(metaYaml, body)];

  const knownGlossIds = new Set(glossaryTerms.map((g) => g._id));
  for (const g of glossaryTerms) {
    const rt = (g as { relatedTerms?: { _ref: string }[] }).relatedTerms;
    if (Array.isArray(rt)) {
      for (const r of rt) {
        if (!knownGlossIds.has(r._ref)) {
          throw new Error(
            `glossary ${g._id} relatedTerms references unknown ${r._ref}`,
          );
        }
      }
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
      source: '01-brand-system/articles/scaphoid-fracture/',
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
