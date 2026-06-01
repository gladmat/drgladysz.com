// site/scripts/seed-facharzt-article.ts
//
// One-off seeder for the "From Facharzt to New Zealand Consultant" knowledge-
// base article (category: news, audience: peer, English). The source is a
// single markdown file with YAML frontmatter at
// 01-brand-system/inbox/facharzt-to-smo-new-zealand.md — NOT a v1.7 package —
// so the generic import-article.ts/seed-article.ts pipeline does not apply
// (no glossary, no references, no keyPoints; draft-only output).
//
// Reuses the repo's existing markdown -> Portable Text helper buildBody()
// (exported from import-article.ts) so the body conversion is identical to
// every other seeded article. The article has no [ref:]/[gloss:] marks, so the
// glossary/reference slug sets passed to buildBody are empty.
//
// Writes a DRAFT (_id: drafts.article-facharzt-to-smo) via createOrReplace, so
// the user reviews and publishes from Studio. Idempotent: re-running with the
// same input overwrites the draft with byte-identical content (buildBody uses
// stable _key counters reset on each fresh module load).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/seed-facharzt-article.ts
//
// Required env: SANITY_API_DEVELOPER_TOKEN (or SANITY_API_WRITE_TOKEN), Editor
// permission. Revoke at sanity.io/manage after the seed if desired.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import yaml from 'js-yaml';
import { buildBody } from './import-article.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The live author document for Mateusz Gładysz (seeded in Phase 5). We REFERENCE
// it — never create a new author doc. The byline renders
// "Mateusz Gładysz · MD · FEBOPRAS · FEBHS" from this doc's credentials field.
const AUTHOR_ID = '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472';

const SOURCE = resolve(
  __dirname,
  '../../01-brand-system/inbox/facharzt-to-smo-new-zealand.md',
);

const DRAFT_ID = 'drafts.article-facharzt-to-smo';

const TOKEN =
  process.env.SANITY_API_EDITOR_TOKEN ||
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN;
if (!TOKEN) {
  console.error(
    'Error: no write token found. Add SANITY_API_DEVELOPER_TOKEN (or SANITY_API_WRITE_TOKEN) to site/.env.local, then re-run with --env-file=.env.local.',
  );
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  useCdn: false,
  token: TOKEN,
});

// Retry transient socket errors with backoff (idempotent ops, always safe).
// Mirrors seed-article.ts withRetry().
async function withRetry<T>(label: string, op: () => Promise<T>): Promise<T> {
  const transient = new Set([
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'EPIPE',
  ]);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      const e = err as NodeJS.ErrnoException & { message?: string };
      const isTransient =
        (e.code && transient.has(e.code)) ||
        (e.message &&
          /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|socket timed out|fetch failed|network|503|502|504|429/i.test(
            e.message,
          ));
      if (!isTransient || attempt === 4) throw err;
      const delayMs = 500 * 2 ** (attempt - 1);
      process.stderr.write(
        `  ↻ ${label} retry ${attempt}/3 after ${delayMs}ms (${e.code ?? e.message})\n`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

// --- Parse the source frontmatter + body --------------------------------------

type FrontMatter = {
  title: string;
  slug: string;
  category: string;
  audience: string;
  publishedDate: string;
  excerpt: string;
  standfirst: string;
  seoTitle: string;
  seoDescription: string;
};

const raw = readFileSync(SOURCE, 'utf8');
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!fmMatch) {
  console.error(`Error: could not parse YAML frontmatter from ${SOURCE}`);
  process.exit(1);
}
const fm = yaml.load(fmMatch[1]) as FrontMatter;
const bodyMd = fmMatch[2];

// Drop standalone `---` horizontal-rule dividers between Parts so they don't
// become literal "---" paragraphs. (buildBody's stripAuthoringHeader is a no-op
// here — the frontmatter is already removed — so passing the cleaned body is
// safe.) No [ref:]/[gloss:] marks in this article: empty slug sets.
const cleanBody = bodyMd
  .split('\n')
  .filter((line) => line.trim() !== '---')
  .join('\n');

const body = buildBody(cleanBody, new Set<string>(), new Set<string>());

// standfirst is a plain `text` field — inline italics can't be expressed, so
// strip the `*…*` markers (the template renders the whole standfirst italic).
const standfirst = fm.standfirst.replace(/\*/g, '').replace(/\s+/g, ' ').trim();

const excerpt = fm.excerpt.replace(/\s+/g, ' ').trim();

// SEO fields lightly shortened to sit cleanly under the schema caps
// (seoTitle ≤60, seoDescription ≤160) — touches only the SEO metadata, not the
// article prose. Source values were 61 / 181 chars.
const seoTitle = 'From Facharzt to New Zealand Consultant — Mateusz Gładysz';
const seoDescription =
  'How a German-trained plastic surgeon reached a Senior Medical Officer post and MCNZ vocational registration in New Zealand — a practical account for IMGs.';

// Length guards mirror the schema's max() validation so we fail loudly here
// rather than producing a doc that flags in Studio.
function assertMax(field: string, value: string, max: number) {
  if (value.length > max) {
    console.error(
      `Error: ${field} is ${value.length} chars (cap ${max}): ${value.slice(0, 60)}…`,
    );
    process.exit(1);
  }
}
assertMax('excerpt', excerpt, 280);
assertMax('standfirst', standfirst, 600);
assertMax('seoTitle', seoTitle, 60);
assertMax('seoDescription', seoDescription, 160);

const doc = {
  _id: DRAFT_ID,
  _type: 'article',
  title: fm.title,
  slug: { _type: 'slug', current: fm.slug },
  language: 'en',
  category: fm.category,
  audience: fm.audience,
  author: { _type: 'reference', _ref: AUTHOR_ID },
  publishedDate: fm.publishedDate,
  excerpt,
  standfirst,
  body,
  seoTitle,
  seoDescription,
};

// Always emit the built doc to a transient JSON file (gitignored under
// scripts/.*.json) so it can be inspected or written through an alternate
// channel (e.g. the Sanity MCP) when no write token is available.
import { writeFileSync } from 'node:fs';
const JSON_OUT = resolve(__dirname, '.facharzt-draft.json');

async function main() {
  console.log('Seeding draft article "From Facharzt to New Zealand Consultant"…');
  console.log(
    `  title=${doc.title}\n  slug=${fm.slug}  category=${fm.category}  audience=${fm.audience}  language=en`,
  );
  console.log(
    `  excerpt=${excerpt.length}  standfirst=${standfirst.length}  seoTitle=${seoTitle.length}  seoDescription=${seoDescription.length}  bodyBlocks=${body.length}`,
  );

  writeFileSync(JSON_OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`  wrote ${JSON_OUT}`);
  if (process.env.EMIT_JSON_ONLY) {
    console.log('  EMIT_JSON_ONLY set — skipping Sanity write.');
    return;
  }

  // Confirm the author doc exists — REFERENCE it, never create it.
  const author = await withRetry('author-check', () =>
    client.fetch<{ _id: string; credentials?: string } | null>(
      '*[_id == $id][0]{_id, credentials}',
      { id: AUTHOR_ID },
    ),
  );
  if (!author) {
    console.error(
      `Error: author doc ${AUTHOR_ID} not found in the dataset. Aborting — this script must not create an author.`,
    );
    process.exit(1);
  }
  console.log(`  author ✓ ${author._id} (credentials: ${author.credentials ?? '—'})`);

  await withRetry(DRAFT_ID, () => client.createOrReplace(doc));
  console.log(`\n✓ Draft written: ${DRAFT_ID}`);
  console.log('\nNext steps:');
  console.log('  1. Review in Studio (npm run studio:dev) — it appears as an unpublished draft.');
  console.log('  2. Publish from Studio yourself when ready (this script never publishes).');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\nSeed failed:', message);
  process.exit(1);
});
