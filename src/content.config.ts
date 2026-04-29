// src/content.config.ts
//
// Astro Content Collections — currently registers the `legal` collection only.
// Source markdown lives under `src/content/legal/{en,pl}/` and is the verbatim
// drop-in from `01-brand-system/legal-pages-package/`. Frontmatter shape per
// `_meta/manifest.json` of that package.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const legal = defineCollection({
  // glob loader walks both en/ and pl/ subfolders. The `id` ends up being the
  // path relative to base (e.g. "en/imprint", "pl/nota-prawna"), which we use
  // to discriminate per-locale routes.
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    slug: z.string(),
    locale: z.enum(['en', 'pl']),
    url: z.string(),
    title: z.string(),
    // No length cap — the locked legal-page descriptions can exceed the
    // SEO-typical 160 chars by design (regulatory framing context).
    description: z.string(),
    version: z.string(),
    lastUpdated: z.string(),
    counterpart: z.string(),
    related: z.array(z.string()).optional(),
  }),
});

export const collections = { legal };
