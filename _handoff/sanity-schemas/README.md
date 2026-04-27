---
status: locked
version: 1.7
purpose: Sanity Studio schema definitions for drgladysz.com
---

# Sanity Studio schemas — drgladysz.com

This document collects all Sanity schema definitions needed for the MVP build. Schemas live in `studio/schemas/` and are exported via `studio/schemas/index.ts`.

Each schema is documented in its corresponding feature spec file (`features/01-citation-system.md` through `features/05-glossary-system.md`). This file is the consolidated index for Claude Code.

---

## Schema list

| Schema | File | Required at launch | Purpose |
|---|---|---|---|
| `author` | `author.ts` | Yes | Author profiles (start with Mateusz; add collaborators later) |
| `article` | `article.ts` | Yes | Long-form blog posts and articles |
| `procedurePage` | `procedurePage.ts` | Yes | AO-Surgery-Reference structured procedure pages (Feature 2) |
| `reference` | `reference.ts` | Yes | Citation source documents (Feature 1) |
| `glossaryTerm` | `glossaryTerm.ts` | Tier 2 (months 1-6) | Glossary entries (Feature 5) |
| `mcqQuestion` | `mcqQuestion.ts` | Tier 2 (months 6-12) | FEBHS MCQ questions (Feature 4) |
| `calculator` | `calculator.ts` | Tier 2 (months 1-12) | Calculator metadata + 6-tab content (Feature 3) |
| `podcastEpisode` | `podcastEpisode.ts` | Tier 2 (when podcast active) | Podcast episode aggregation |

---

## Schema index — `studio/schemas/index.ts`

```typescript
// studio/schemas/index.ts
import { author } from './author';
import { article } from './article';
import { procedurePage } from './procedurePage';
import { reference } from './reference';
import { glossaryTerm } from './glossaryTerm';
import { mcqQuestion } from './mcqQuestion';
import { calculator } from './calculator';
import { podcastEpisode } from './podcastEpisode';

export const schemaTypes = [
  author,
  article,
  procedurePage,
  reference,
  glossaryTerm,
  mcqQuestion,
  calculator,
  podcastEpisode,
];
```

---

## `author.ts`

```typescript
// studio/schemas/author.ts
import { defineType, defineField } from 'sanity';

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Full name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'credentials',
      title: 'Credentials',
      type: 'string',
      description: 'e.g., "MD, FEBOPRAS, FEBHS"',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g., "Consultant Plastic and Hand Surgeon"',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Short bio',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'orcid',
      title: 'ORCID ID',
      type: 'string',
    }),
    defineField({
      name: 'linkedin',
      title: 'LinkedIn URL',
      type: 'url',
    }),
  ],
});
```

---

## `article.ts`

The article schema is the substantive blog content type. Includes Portable Text body with citation, glossary term, and standard formatting marks.

```typescript
// studio/schemas/article.ts
import { defineType, defineField } from 'sanity';

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'content', title: 'Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Patient information', value: 'patient' },
          { title: 'Expert blog', value: 'expert' },
          { title: 'FESSH preparation', value: 'fessh-prep' },
          { title: 'News / commentary', value: 'news' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'audience',
      title: 'Primary audience',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Patient', value: 'patient' },
          { title: 'Peer (clinician)', value: 'peer' },
          { title: 'Mixed', value: 'mixed' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedDate',
      title: 'Published date',
      type: 'date',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last clinically reviewed',
      type: 'date',
      group: 'meta',
      description: 'For clinical articles. Display this prominently. Update at least annually.',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (for cards and SEO)',
      type: 'text',
      rows: 3,
      group: 'meta',
      validation: (Rule) => Rule.required().max(280),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image (optional)',
      type: 'image',
      options: { hotspot: true },
      group: 'meta',
      fields: [
        { name: 'alt', title: 'Alt text', type: 'string', validation: (Rule) => Rule.required() },
      ],
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key Points box',
      type: 'object',
      group: 'content',
      fields: [
        { name: 'question', title: 'Question', type: 'string' },
        { name: 'findings', title: 'Findings', type: 'string' },
        { name: 'meaning', title: 'Meaning', type: 'text', rows: 3 },
      ],
      description: 'Optional JAMA-style summary at top of article',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      validation: (Rule) => Rule.required(),
      of: [
        {
          type: 'block',
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', validation: (Rule) => Rule.required() },
                  { name: 'newTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
                ],
              },
              {
                name: 'citation',
                type: 'object',
                title: 'Citation',
                fields: [
                  { name: 'reference', type: 'reference', to: [{ type: 'reference' }], validation: (Rule) => Rule.required() },
                ],
              },
              {
                name: 'glossaryTerm',
                type: 'object',
                title: 'Glossary term',
                fields: [
                  { name: 'term', type: 'reference', to: [{ type: 'glossaryTerm' }], validation: (Rule) => Rule.required() },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            { name: 'alt', title: 'Alt text', type: 'string', validation: (Rule) => Rule.required() },
          ],
        },
        {
          type: 'object',
          name: 'callout',
          title: 'Callout box',
          fields: [
            {
              name: 'type',
              type: 'string',
              options: {
                list: [
                  { title: 'Info', value: 'info' },
                  { title: 'Warning', value: 'warning' },
                  { title: 'Pearl / Pitfall', value: 'pearl' },
                ],
              },
              initialValue: 'info',
            },
            { name: 'content', type: 'array', of: [{ type: 'block' }] },
          ],
        },
      ],
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title (≤60 chars)',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO meta description (≤160 chars)',
      type: 'text',
      rows: 2,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      publishedDate: 'publishedDate',
    },
    prepare({ title, category, publishedDate }) {
      return {
        title,
        subtitle: `${category} · ${publishedDate || 'unpublished'}`,
      };
    },
  },
});
```

---

## `procedurePage.ts`, `reference.ts`, `glossaryTerm.ts`, `mcqQuestion.ts`, `calculator.ts`

See feature spec files for full schemas:
- `features/02-procedure-schema.md` — full `procedurePage` schema
- `features/01-citation-system.md` — full `reference` schema
- `features/05-glossary-system.md` — full `glossaryTerm` schema
- `features/04-febhs-mcq.md` — full `mcqQuestion` schema
- `features/03-calculator-suite.md` — full `calculator` schema

---

## `podcastEpisode.ts` (Tier 2)

```typescript
// studio/schemas/podcastEpisode.ts
import { defineType, defineField } from 'sanity';

export const podcastEpisode = defineType({
  name: 'podcastEpisode',
  title: 'Podcast episode',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Episode title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'episodeNumber', title: 'Episode number', type: 'number' }),
    defineField({ name: 'publishedDate', title: 'Published date', type: 'date', validation: (Rule) => Rule.required() }),
    defineField({ name: 'duration', title: 'Duration (minutes)', type: 'number' }),
    defineField({
      name: 'platform',
      title: 'Hosted on',
      type: 'string',
      options: {
        list: [
          { title: 'Spotify', value: 'spotify' },
          { title: 'Apple Podcasts', value: 'apple' },
          { title: 'YouTube', value: 'youtube' },
          { title: 'Other', value: 'other' },
        ],
      },
    }),
    defineField({ name: 'externalUrl', title: 'External URL (where to listen)', type: 'url', validation: (Rule) => Rule.required() }),
    defineField({ name: 'embedUrl', title: 'Embed URL (optional)', type: 'url', description: 'Direct embed URL if hosted on Spotify/SoundCloud/etc.' }),
    defineField({
      name: 'showNotes',
      title: 'Show notes',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'transcript',
      title: 'Transcript (optional)',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Full transcript for SEO and accessibility. Highly recommended.',
    }),
    defineField({
      name: 'guests',
      title: 'Guests',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
  ],
});
```

---

## Sanity Studio config — `sanity.config.ts`

```typescript
// sanity.config.ts (root of repo, embedded studio)
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './studio/schemas';

export default defineConfig({
  name: 'drgladysz',
  title: 'drgladysz.com — Sanity Studio',
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  basePath: '/studio',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('article').title('Articles'),
            S.documentTypeListItem('procedurePage').title('Procedure pages'),
            S.documentTypeListItem('reference').title('References'),
            S.divider(),
            S.documentTypeListItem('glossaryTerm').title('Glossary terms'),
            S.documentTypeListItem('mcqQuestion').title('MCQ questions'),
            S.documentTypeListItem('calculator').title('Calculators'),
            S.documentTypeListItem('podcastEpisode').title('Podcast episodes'),
            S.divider(),
            S.documentTypeListItem('author').title('Authors'),
          ]),
    }),
    visionTool(), // GROQ query playground for development
  ],
  schema: {
    types: schemaTypes,
  },
});
```

---

## GROQ queries — `src/lib/sanity.ts`

```typescript
// src/lib/sanity.ts (excerpt)
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  useCdn: true, // Use Sanity CDN for cached reads
  token: import.meta.env.SANITY_API_READ_TOKEN, // For private content
});

export async function getArticleBySlug(slug: string) {
  return client.fetch(`
    *[_type == "article" && slug.current == $slug][0] {
      ...,
      author->,
      heroImage { ..., asset-> },
      "references": body[].markDefs[_type == "citation"].reference->{
        _id,
        authors,
        title,
        journal,
        year,
        volume,
        issue,
        pages,
        pmid,
        doi,
        abstractPreview
      }
    }
  `, { slug });
}

export async function getAllArticles() {
  return client.fetch(`
    *[_type == "article" && defined(publishedDate)] | order(publishedDate desc) {
      _id,
      title,
      slug,
      excerpt,
      category,
      audience,
      publishedDate,
      author->{ name },
      heroImage { ..., asset-> }
    }
  `);
}

export async function getProcedureBySlug(slug: string) {
  return client.fetch(`
    *[_type == "procedurePage" && slug.current == $slug][0] {
      ...,
      keySteps[]{ ..., image { ..., asset-> } }
    }
  `, { slug });
}

export async function getAllGlossaryTerms() {
  return client.fetch(`
    *[_type == "glossaryTerm"] | order(term asc) {
      _id,
      term,
      termPolish,
      slug,
      shortDefinition,
      category,
      illustration { ..., asset-> }
    }
  `);
}

export async function getGlossaryTermBySlug(slug: string) {
  return client.fetch(`
    *[_type == "glossaryTerm" && slug.current == $slug][0] {
      ...,
      illustration { ..., asset-> },
      relatedTerms[]->
    }
  `, { slug });
}

export async function getMcqQuestionsByTopic(topic: string) {
  return client.fetch(`
    *[_type == "mcqQuestion" && topic == $topic && reviewStatus == "published"] | order(difficulty asc) {
      ...,
      sourceArticle->{ title, slug }
    }
  `, { topic });
}

export async function getReferencesInOrder(documentId: string) {
  // Helper: collect all references cited in a document, in order of appearance
  const document = await client.fetch(`*[_id == $id][0]`, { id: documentId });
  const refs: any[] = [];
  const seenIds = new Set();
  
  function walk(blocks: any[]) {
    for (const block of blocks || []) {
      if (block.markDefs) {
        for (const mark of block.markDefs) {
          if (mark._type === 'citation' && mark.reference && !seenIds.has(mark.reference._ref)) {
            seenIds.add(mark.reference._ref);
            refs.push(mark.reference._ref);
          }
        }
      }
    }
  }
  
  walk(document.body || document.evidence || []);
  
  // Fetch reference documents in order
  return client.fetch(`*[_id in $refs] | order(@ in $refs)`, { refs });
}
```
