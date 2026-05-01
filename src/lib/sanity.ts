// src/lib/sanity.ts
//
// Single Sanity client + typed GROQ accessors. Used at build time only — Astro
// pages are statically generated, so the client runs in node during `astro build`
// and never ships to the browser.
//
// Tokens: a read-only token in SANITY_API_READ_TOKEN unlocks draft previews and
// embargoed-but-published documents. The frontend never needs a write token.
//
// CDN: disabled (`useCdn: false`) — builds are not user-facing, and CDN
// caching causes recently-published docs to be invisible for ~minutes after
// publish. Use the live API for build-time freshness; switch to `useCdn: true`
// only if Sanity's per-build read costs become an issue.
import { createClient, type ClientConfig } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91';
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
const apiVersion = '2026-01-01';

const config: ClientConfig = {
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: 'published',
  token: import.meta.env.SANITY_API_READ_TOKEN || undefined,
};

export const sanityClient = createClient(config);

const builder = imageUrlBuilder({ projectId, dataset });
export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SanityRefDoc = {
  _id: string;
  _type: 'bibReference';
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  doi?: string;
  pmcid?: string;
  url?: string;
  pubType?:
    | 'journal'
    | 'book'
    | 'chapter'
    | 'conference'
    | 'online'
    | 'guideline';
  editors?: string[];
  publisher?: string;
  publisherLocation?: string;
  edition?: string;
  abstractPreview?: string;
};

export type PortableTextBlock = {
  _type: string;
  _key?: string;
  [k: string]: unknown;
};

export type SanityImage = {
  _type: 'image';
  asset: { _ref: string; _type: 'reference' };
  alt: string;
  caption?: string;
  hotspot?: unknown;
  crop?: unknown;
};

export type SanityGlossaryTerm = {
  _id: string;
  _type: 'glossaryTerm';
  term: string;
  termPolish?: string;
  slug: { current: string };
  category:
    | 'anatomy'
    | 'condition'
    | 'procedure'
    | 'investigation'
    | 'treatment'
    | 'outcome'
    | 'structure'
    | 'other';
  shortDefinition: string;
  shortDefinitionPolish?: string;
  fullDefinition?: PortableTextBlock[];
  fullDefinitionPolish?: PortableTextBlock[];
  synonyms?: string[];
  illustration?: SanityImage;
};

// Lightweight projection for the glossary index page — no fullDefinition,
// no illustration, no relatedTerms. The index renders a card per term with
// the short definition only.
export type GlossarySummary = {
  _id: string;
  term: string;
  termPolish?: string;
  slug: { current: string };
  category: SanityGlossaryTerm['category'];
  shortDefinition: string;
  shortDefinitionPolish?: string;
};

// Full projection for the glossary detail page. Adds resolved relatedTerms
// and back-referenced articles whose Portable Text body uses the term via
// a glossaryTerm mark (computed via GROQ subquery; see GLOSSARY_DETAIL_PROJECTION).
export type SanityGlossaryTermFull = SanityGlossaryTerm & {
  relatedTerms?: GlossarySummary[];
  articlesUsingTerm?: ArticleSummary[];
};

// ---------------------------------------------------------------------------
// Calculator (Tier 2, Feature 3)
// ---------------------------------------------------------------------------

export type CalculatorComponentName =
  | 'quickdash'
  | 'prwe'
  | 'boston-cts'
  | 'mhq'
  | 'mayo-wrist';

export type Locale = 'en' | 'pl';

export type SanityCalculator = {
  _id: string;
  _type: 'calculator';
  name: string;
  fullName: string;
  slug: { current: string };
  locale: Locale;
  componentName: CalculatorComponentName;
  shortDescription: string;
  whenToUse: PortableTextBlock[];
  pearlsPitfalls?: PortableTextBlock[];
  whyUse: PortableTextBlock[];
  nextSteps?: PortableTextBlock[];
  evidence: PortableTextBlock[];
  creatorInsights?: PortableTextBlock[];
  seoTitle?: string;
  seoDescription?: string;
};

// Lightweight projection for the index page — no Portable Text bodies, just
// what cards need to render.
export type CalculatorSummary = {
  _id: string;
  name: string;
  fullName: string;
  slug: { current: string };
  locale: Locale;
  componentName: CalculatorComponentName;
  shortDescription: string;
};

// ---------------------------------------------------------------------------
// MCQ (Tier 2, Feature 4)
// ---------------------------------------------------------------------------

export type MCQTopic =
  | 'anatomy'
  | 'trauma'
  | 'tendon'
  | 'nerve-compression'
  | 'nerve-injury'
  | 'joint'
  | 'bone'
  | 'microsurgery'
  | 'congenital'
  | 'tumours'
  | 'imaging'
  | 'examination';

export type MCQReviewStatus = 'draft' | 'in-review' | 'published' | 'errata';

export type MCQOption = {
  _key: string;
  text: string;
  isCorrect: boolean;
  explanationDetail?: string;
};

export type SanityMCQQuestion = {
  _id: string;
  _type: 'mcqQuestion';
  topic: MCQTopic;
  difficulty: 1 | 2 | 3 | 4 | 5;
  locale: Locale;
  tags?: string[];
  sourceArticle?:
    | { _type: 'article'; title: string; slug: { current: string } }
    | { _type: 'procedurePage'; title: string; slug: { current: string } }
    | null;
  stem: PortableTextBlock[];
  options: MCQOption[];
  explanation: PortableTextBlock[];
  reviewStatus: MCQReviewStatus;
  reviewedBy?: string;
  reviewDate?: string;
};

export type ArticleAuthor = {
  name: string;
  credentials?: string;
  // The Phase 5 seed populated post-nominals under a non-schema `title` field
  // (the schema's `credentials` field was misused for the role). Reading both
  // here lets the byline logic pick the post-nominals from whichever field
  // they were stored in — defensive against the data quirk.
  title?: string;
  role?: string;
};

// Resolved sibling article shown in the "Related" block at the end of an
// article. Lighter than ArticleSummary — only what the link block needs.
export type RelatedArticleRef = {
  _id: string;
  title: string;
  slug: { current: string };
  category: 'patient' | 'expert' | 'fessh-prep' | 'news';
};

export type RelatedProcedureRef = {
  _id: string;
  title: string;
  slug: { current: string };
  category: 'hand-surgery' | 'reconstructive-microsurgery' | 'skin-cancer';
};

export type SanityArticle = {
  _id: string;
  _type: 'article';
  title: string;
  slug: { current: string };
  category: 'patient' | 'expert' | 'fessh-prep' | 'news';
  audience: 'patient' | 'peer' | 'mixed';
  // GROQ projects author->{name, credentials}; null if the reference is
  // unresolved (deleted target). Author is required in the schema, so this
  // should be populated for any published article.
  author: ArticleAuthor | null;
  publishedDate: string;
  lastUpdated?: string;
  excerpt: string;
  // Italic editorial intro rendered below the byline. Optional — the [slug]
  // template falls back to `excerpt` when null/missing so the carpal-tunnel
  // article (no standfirst) keeps its current rendering.
  standfirst?: string | null;
  heroImage?: SanityImage;
  keyPoints?: { question?: string; findings?: string; meaning?: string };
  body: PortableTextBlock[];
  // Sibling content surfaced at the bottom of the article. Skipped when both
  // arrays are empty. Unresolved references (target deleted) come back null
  // from GROQ; we filter those out at render time.
  relatedArticles?: (RelatedArticleRef | null)[];
  relatedProcedures?: (RelatedProcedureRef | null)[];
  seoTitle?: string;
  seoDescription?: string;
};

export type ProcedureStep = {
  _type: 'procedureStep';
  _key: string;
  title: string;
  description: PortableTextBlock[];
  image?: SanityImage;
  pitfall?: string;
};

export type SanityProcedurePage = {
  _id: string;
  _type: 'procedurePage';
  title: string;
  slug: { current: string };
  category: 'hand-surgery' | 'reconstructive-microsurgery' | 'skin-cancer';
  audience: 'patient' | 'peer' | 'mixed';
  lastUpdated: string;
  summary: string;
  keyPoints?: { question?: string; findings?: string; meaning?: string };
  heroImage?: SanityImage;
  indications: PortableTextBlock[];
  contraindications?: PortableTextBlock[];
  anatomy: PortableTextBlock[];
  positioning?: PortableTextBlock[];
  approach: PortableTextBlock[];
  keySteps: ProcedureStep[];
  closure?: PortableTextBlock[];
  aftercare: PortableTextBlock[];
  complications: PortableTextBlock[];
  patientSummary?: PortableTextBlock[];
  evidence: PortableTextBlock[];
  seoTitle?: string;
  seoDescription?: string;
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const REFERENCE_PROJECTION = /* groq */ `{
  _id, _type,
  title, authors, journal, year, volume, issue, pages,
  pmid, doi, pmcid, url, pubType,
  editors, publisher, publisherLocation, edition,
  abstractPreview
}`;

const ARTICLE_PROJECTION = /* groq */ `{
  _id, _type, title, slug, category, audience,
  "author": author->{name, credentials, title, role},
  publishedDate, lastUpdated, excerpt, standfirst,
  heroImage,
  keyPoints,
  body,
  "relatedArticles": relatedArticles[]->{ _id, title, slug, category },
  "relatedProcedures": relatedProcedures[]->{ _id, title, slug, category },
  seoTitle, seoDescription
}`;

const GLOSSARY_PROJECTION = /* groq */ `{
  _id, _type, term, termPolish, slug, category,
  shortDefinition, shortDefinitionPolish,
  fullDefinition, fullDefinitionPolish,
  synonyms,
  illustration
}`;

const GLOSSARY_SUMMARY_PROJECTION = /* groq */ `{
  _id, term, termPolish, slug, category,
  shortDefinition, shortDefinitionPolish
}`;

// Detail-page projection. Resolves relatedTerms references and pulls the list
// of articles whose body has a glossaryTerm mark targeting this doc.
//
// The subquery `^._id in body[].markDefs[_type == "glossaryTerm"].term._ref`
// is exact: it counts only articles whose Portable Text body has a markDef
// pointing at THIS glossary term. This is more precise than `references(^._id)`,
// which over-reports by including indirect references via `relatedTerms`
// (a related term cited in an article would otherwise pull that article into
// every related term's "articles using" list).
//
// `^` inside a subquery references the parent context — here, the glossaryTerm
// doc returned at the top level.
const GLOSSARY_DETAIL_PROJECTION = /* groq */ `{
  _id, _type, term, termPolish, slug, category,
  shortDefinition, shortDefinitionPolish,
  fullDefinition, fullDefinitionPolish,
  synonyms,
  illustration,
  "relatedTerms": relatedTerms[]->{
    _id, term, termPolish, slug, category,
    shortDefinition, shortDefinitionPolish
  },
  "articlesUsingTerm": *[
    _type == "article"
    && defined(slug.current)
    && ^._id in body[].markDefs[_type == "glossaryTerm"].term._ref
  ] | order(publishedDate desc) {
    _id, title, slug, category, audience,
    publishedDate, lastUpdated, excerpt, heroImage
  }
}`;

const PROCEDURE_PROJECTION = /* groq */ `{
  _id, _type, title, slug, category, audience, lastUpdated, summary,
  keyPoints,
  heroImage,
  indications, contraindications, anatomy, positioning, approach,
  keySteps,
  closure, aftercare, complications,
  patientSummary,
  evidence,
  seoTitle, seoDescription
}`;

export async function getAllArticleSlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(
    /* groq */ `*[_type == "article" && defined(slug.current)].slug.current`,
  );
}

// Lightweight projection for the /en/blog index — title/category/audience/
// publishedDate/excerpt only. Avoids pulling the full Portable Text body.
export type ArticleSummary = {
  _id: string;
  title: string;
  slug: { current: string };
  category: SanityArticle['category'];
  audience: SanityArticle['audience'];
  publishedDate: string;
  lastUpdated?: string;
  excerpt: string;
  heroImage?: SanityImage;
};

export async function getAllArticleSummaries(): Promise<ArticleSummary[]> {
  return sanityClient.fetch<ArticleSummary[]>(
    /* groq */ `*[_type == "article" && defined(slug.current)] | order(publishedDate desc){
      _id, title, slug, category, audience, publishedDate, lastUpdated, excerpt, heroImage
    }`,
  );
}

export type ProcedureSummary = {
  _id: string;
  title: string;
  slug: { current: string };
  category: SanityProcedurePage['category'];
  audience: SanityProcedurePage['audience'];
  lastUpdated: string;
  summary: string;
  heroImage?: SanityImage;
};

export async function getAllProcedureSummaries(): Promise<ProcedureSummary[]> {
  return sanityClient.fetch<ProcedureSummary[]>(
    /* groq */ `*[_type == "procedurePage" && defined(slug.current)] | order(title asc){
      _id, title, slug, category, audience, lastUpdated, summary, heroImage
    }`,
  );
}

export async function getArticleBySlug(
  slug: string,
): Promise<SanityArticle | null> {
  return sanityClient.fetch<SanityArticle | null>(
    /* groq */ `*[_type == "article" && slug.current == $slug][0]${ARTICLE_PROJECTION}`,
    { slug },
  );
}

export async function getAllProcedureSlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(
    /* groq */ `*[_type == "procedurePage" && defined(slug.current)].slug.current`,
  );
}

export async function getProcedureBySlug(
  slug: string,
): Promise<SanityProcedurePage | null> {
  return sanityClient.fetch<SanityProcedurePage | null>(
    /* groq */ `*[_type == "procedurePage" && slug.current == $slug][0]${PROCEDURE_PROJECTION}`,
    { slug },
  );
}

export async function getReferencesByIds(
  ids: string[],
): Promise<SanityRefDoc[]> {
  if (ids.length === 0) return [];
  return sanityClient.fetch<SanityRefDoc[]>(
    /* groq */ `*[_type == "bibReference" && _id in $ids]${REFERENCE_PROJECTION}`,
    { ids },
  );
}

export async function getGlossaryTermsByIds(
  ids: string[],
): Promise<SanityGlossaryTerm[]> {
  if (ids.length === 0) return [];
  return sanityClient.fetch<SanityGlossaryTerm[]>(
    /* groq */ `*[_type == "glossaryTerm" && _id in $ids]${GLOSSARY_PROJECTION}`,
    { ids },
  );
}

// All glossary terms for the index page. Sort happens in JS rather than in
// GROQ because the index groups by display term in the active locale (term
// for /en/, termPolish for /pl/) and Polish ordering rules differ — fixing
// the sort in JS keeps the GROQ stable and the locale-specific ordering
// where it belongs.
export async function getAllGlossaryTerms(): Promise<GlossarySummary[]> {
  return sanityClient.fetch<GlossarySummary[]>(
    /* groq */ `*[_type == "glossaryTerm" && defined(slug.current)]${GLOSSARY_SUMMARY_PROJECTION}`,
  );
}

// Slugs only — for getStaticPaths. One slug per doc; the page generator
// emits both /en/ and /pl/ pages from the same slug list.
export async function getAllGlossaryTermSlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(
    /* groq */ `*[_type == "glossaryTerm" && defined(slug.current)].slug.current`,
  );
}

export async function getGlossaryTermBySlug(
  slug: string,
): Promise<SanityGlossaryTermFull | null> {
  return sanityClient.fetch<SanityGlossaryTermFull | null>(
    /* groq */ `*[_type == "glossaryTerm" && slug.current == $slug][0]${GLOSSARY_DETAIL_PROJECTION}`,
    { slug },
  );
}

// ---------------------------------------------------------------------------
// Calculator queries
// ---------------------------------------------------------------------------

const CALCULATOR_PROJECTION = /* groq */ `{
  _id, _type, name, fullName, slug, locale, componentName,
  shortDescription,
  whenToUse, pearlsPitfalls, whyUse, nextSteps, evidence, creatorInsights,
  seoTitle, seoDescription
}`;

const CALCULATOR_SUMMARY_PROJECTION = /* groq */ `{
  _id, name, fullName, slug, locale, componentName, shortDescription
}`;

export async function getAllCalculatorSummaries(
  locale: Locale,
): Promise<CalculatorSummary[]> {
  return sanityClient.fetch<CalculatorSummary[]>(
    /* groq */ `*[_type == "calculator" && locale == $locale && defined(slug.current)] | order(name asc)${CALCULATOR_SUMMARY_PROJECTION}`,
    { locale },
  );
}

// Slug list for getStaticPaths. Returns one entry per locale, so the same
// underlying calculator (identified by `componentName`) generates one EN page
// and one PL page from two separate Sanity docs.
export async function getAllCalculatorSlugsForLocale(
  locale: Locale,
): Promise<string[]> {
  return sanityClient.fetch<string[]>(
    /* groq */ `*[_type == "calculator" && locale == $locale && defined(slug.current)].slug.current`,
    { locale },
  );
}

export async function getCalculatorBySlug(
  slug: string,
  locale: Locale,
): Promise<SanityCalculator | null> {
  return sanityClient.fetch<SanityCalculator | null>(
    /* groq */ `*[_type == "calculator" && locale == $locale && slug.current == $slug][0]${CALCULATOR_PROJECTION}`,
    { slug, locale },
  );
}

// ---------------------------------------------------------------------------
// MCQ queries
//
// All MCQ queries filter on `reviewStatus == "published"` so draft and
// in-review content never reaches the rendered HTML. This is enforced at the
// query level rather than the page level — defence in depth, since a missing
// page-level filter would silently surface unreviewed clinical content.
// ---------------------------------------------------------------------------

const MCQ_PROJECTION = /* groq */ `{
  _id, _type, topic, difficulty, locale, tags,
  "sourceArticle": sourceArticle->{_type, title, slug},
  stem,
  options,
  explanation,
  reviewStatus, reviewedBy, reviewDate
}`;

export async function getPublishedMCQQuestionsByTopic(
  topic: MCQTopic,
  locale: Locale,
): Promise<SanityMCQQuestion[]> {
  return sanityClient.fetch<SanityMCQQuestion[]>(
    /* groq */ `*[
      _type == "mcqQuestion"
      && locale == $locale
      && topic == $topic
      && reviewStatus == "published"
    ] | order(difficulty asc, _createdAt asc)${MCQ_PROJECTION}`,
    { topic, locale },
  );
}

// Topics that have at least one published question in the given locale.
// Used to decide which topic landing pages to surface in the /learn index.
export async function getMCQTopicsWithPublishedQuestions(
  locale: Locale,
): Promise<{ topic: MCQTopic; count: number }[]> {
  const all = await sanityClient.fetch<{ topic: MCQTopic }[]>(
    /* groq */ `*[
      _type == "mcqQuestion"
      && locale == $locale
      && reviewStatus == "published"
    ]{ topic }`,
    { locale },
  );
  const counts = new Map<MCQTopic, number>();
  for (const q of all) {
    counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([topic, count]) => ({
    topic,
    count,
  }));
}

// ---------------------------------------------------------------------------
// Citation extraction
//
// Walks Portable Text blocks to find every `citation` markDef in document order
// and returns the unique reference _ids (deduped by first occurrence). The
// returned order is the canonical citation index used to number the bibliography.
// ---------------------------------------------------------------------------

type MarkDef = {
  _type: string;
  _key: string;
  reference?: { _ref: string };
  term?: { _ref: string };
};

function isPortableTextBlock(b: unknown): b is PortableTextBlock & {
  _type: 'block';
  markDefs?: MarkDef[];
  children?: { _type: string; marks?: string[] }[];
} {
  return (
    typeof b === 'object' &&
    b !== null &&
    (b as { _type?: unknown })._type === 'block'
  );
}

/**
 * Walks every Portable Text array on the doc and returns the unique mark
 * targets (citation reference _ids or glossaryTerm _ids) in order of first
 * appearance. The walker recurses into callout content so marks inside
 * callouts are counted.
 */
function extractMarkOrderFromBlocks(
  blockGroups: (PortableTextBlock[] | undefined)[],
  markType: 'citation' | 'glossaryTerm',
  refField: 'reference' | 'term',
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  const walk = (blocks: PortableTextBlock[] | undefined) => {
    if (!blocks) return;
    for (const block of blocks) {
      if (!isPortableTextBlock(block)) {
        // Could be a callout — recurse into its content array if present.
        if (
          typeof block === 'object' &&
          block !== null &&
          'content' in block &&
          Array.isArray((block as { content?: unknown[] }).content)
        ) {
          walk((block as unknown as { content: PortableTextBlock[] }).content);
        }
        continue;
      }
      const markDefs: MarkDef[] = block.markDefs ?? [];
      const matchingKeys = new Set(
        markDefs.filter((m) => m._type === markType).map((m) => m._key),
      );
      if (matchingKeys.size === 0) continue;
      for (const child of block.children ?? []) {
        if (!Array.isArray(child.marks)) continue;
        for (const m of child.marks) {
          if (matchingKeys.has(m)) {
            const def = markDefs.find((d) => d._key === m);
            const targetId = def?.[refField]?._ref;
            if (targetId && !seen.has(targetId)) {
              seen.add(targetId);
              order.push(targetId);
            }
          }
        }
      }
    }
  };

  for (const group of blockGroups) walk(group);
  return order;
}

export function extractCitationOrderFromBlocks(
  blockGroups: (PortableTextBlock[] | undefined)[],
): string[] {
  return extractMarkOrderFromBlocks(blockGroups, 'citation', 'reference');
}

export function extractGlossaryOrderFromBlocks(
  blockGroups: (PortableTextBlock[] | undefined)[],
): string[] {
  return extractMarkOrderFromBlocks(blockGroups, 'glossaryTerm', 'term');
}
