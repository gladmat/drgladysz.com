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

export type SanityArticle = {
  _id: string;
  _type: 'article';
  title: string;
  slug: { current: string };
  category: 'patient' | 'expert' | 'fessh-prep' | 'news';
  audience: 'patient' | 'peer' | 'mixed';
  author: { _ref: string };
  publishedDate: string;
  lastUpdated?: string;
  excerpt: string;
  heroImage?: SanityImage;
  keyPoints?: { question?: string; findings?: string; meaning?: string };
  body: PortableTextBlock[];
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
  author, publishedDate, lastUpdated, excerpt,
  heroImage,
  keyPoints,
  body,
  seoTitle, seoDescription
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

// ---------------------------------------------------------------------------
// Citation extraction
//
// Walks Portable Text blocks to find every `citation` markDef in document order
// and returns the unique reference _ids (deduped by first occurrence). The
// returned order is the canonical citation index used to number the bibliography.
// ---------------------------------------------------------------------------

type MarkDef = { _type: string; _key: string; reference?: { _ref: string } };

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
 * Walks every Portable Text array on the doc and returns the unique reference
 * _ids in order of first appearance. Each call site (article body, procedure
 * step descriptions, evidence section, etc.) is walked recursively so step
 * descriptions inside `keySteps[].description` count too.
 */
export function extractCitationOrderFromBlocks(
  blockGroups: (PortableTextBlock[] | undefined)[],
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
      const citationKeys = new Set(
        markDefs.filter((m) => m._type === 'citation').map((m) => m._key),
      );
      if (citationKeys.size === 0) continue;
      for (const child of block.children ?? []) {
        if (!Array.isArray(child.marks)) continue;
        for (const m of child.marks) {
          if (citationKeys.has(m)) {
            const def = markDefs.find((d) => d._key === m);
            const refId = def?.reference?._ref;
            if (refId && !seen.has(refId)) {
              seen.add(refId);
              order.push(refId);
            }
          }
        }
      }
    }
  };

  for (const group of blockGroups) walk(group);
  return order;
}
