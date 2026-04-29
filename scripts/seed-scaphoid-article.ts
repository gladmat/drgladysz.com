// site/scripts/seed-scaphoid-article.ts
//
// Seeder that takes the output of import-scaphoid-article.ts and writes the
// documents to Sanity using `@sanity/client` with a write token. Custom
// slug-form `_id`s are honored (unlike the MCP create_documents_from_json
// tool which always assigns UUIDs), so the resulting documents have tidy
// IDs:
//   bibReference  → gelberman-menon-1980, dias-swifft-2020, ...
//   glossaryTerm  → glossary-scaphoid, glossary-avn, ...
//   article       → article-scaphoid-fractures
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/seed-scaphoid-article.ts
//
// Required env: SANITY_API_WRITE_TOKEN (Editor permission). After the seed
// completes, revoke the token at sanity.io/manage → API → Tokens.
//
// Idempotent: uses `createOrReplace`, so re-running with the same input is
// safe — existing docs are overwritten with the same content.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKEN = process.env.SANITY_API_WRITE_TOKEN;
if (!TOKEN) {
  console.error(
    'Error: SANITY_API_WRITE_TOKEN missing. Add it to site/.env.local then re-run with --env-file=.env.local.',
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

const importJson = JSON.parse(
  readFileSync(resolve(__dirname, '.scaphoid-import.json'), 'utf8'),
);

type Doc = { _id: string; _type: string; [k: string]: unknown };

async function seed(label: string, docs: Doc[]) {
  console.log(`\n→ Writing ${docs.length} ${label} document(s)…`);
  for (const doc of docs) {
    try {
      await client.createOrReplace(doc);
      process.stdout.write(`  ✓ ${doc._id}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${doc._id} — ${message}`);
      throw err;
    }
  }
}

async function patchAuthor() {
  // Phase 5 seeded the author doc with the role string in `credentials`
  // and the post-nominals in a non-schema `title` field. Move them into
  // the schema-correct slots so the byline renders cleanly without the
  // [slug].astro field-quirk fallback in production.
  const authorId = '2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472';
  console.log(`\n→ Patching author doc ${authorId} (move title→credentials, fix role)…`);
  try {
    await client
      .patch(authorId)
      .set({
        credentials: 'MD, FEBOPRAS, FEBHS',
        role: 'Consultant Plastic and Hand Surgeon',
      })
      .unset(['title'])
      .commit();
    process.stdout.write('  ✓ author patched\n');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ author patch failed — ${message}`);
    throw err;
  }
}

async function seedGlossary(docs: Doc[]) {
  // Pass 1: create all glossary docs without relatedTerms. Cross-references
  // among the same batch (e.g. scaphoid → avn → snac-wrist → scaphoid) form
  // cycles that can't be ordered topologically; Sanity's strong-reference
  // validation rejects any doc whose ref points at an as-yet-uncreated doc.
  console.log(`\n→ Writing ${docs.length} glossaryTerm document(s) (pass 1: without relatedTerms)…`);
  const docsWithoutRelated = docs.map((d) => {
    const { relatedTerms, ...rest } = d as Doc & { relatedTerms?: unknown };
    void relatedTerms;
    return rest;
  });
  for (const doc of docsWithoutRelated) {
    try {
      await client.createOrReplace(doc);
      process.stdout.write(`  ✓ ${doc._id}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${doc._id} — ${message}`);
      throw err;
    }
  }

  // Pass 2: patch in relatedTerms now that every target exists.
  console.log(`\n→ Patching glossaryTerm relatedTerms (pass 2)…`);
  for (const doc of docs) {
    const related = (doc as Doc & { relatedTerms?: unknown[] }).relatedTerms;
    if (!Array.isArray(related) || related.length === 0) continue;
    try {
      await client.patch(doc._id).set({ relatedTerms: related }).commit();
      process.stdout.write(`  ✓ ${doc._id} (${related.length} related)\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${doc._id} relatedTerms — ${message}`);
      throw err;
    }
  }
}

async function main() {
  console.log('Seeding scaphoid-fractures content into Sanity (production)…');

  await patchAuthor();
  await seed('bibReference', importJson.bibReferences);
  await seedGlossary(importJson.glossaryTerms);
  await seed('article', importJson.articles);

  console.log('\n✓ Seed complete.');
  console.log('\nNext steps:');
  console.log(
    '  1. Verify counts at https://drgladysz.sanity.studio/structure (or via GROQ).',
  );
  console.log(
    '  2. Revoke the write token at https://www.sanity.io/manage/project/' +
      (process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91') +
      '/api → Tokens.',
  );
  console.log('  3. cd site && npm run dev → http://localhost:4321/en/blog/scaphoid-fractures');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\nSeed failed:', message);
  process.exit(1);
});
