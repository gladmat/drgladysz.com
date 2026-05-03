// site/scripts/seed-article.ts
//
// Generalized seeder for v1.7-package expert articles. Reads the JSON output
// of import-article.ts and writes the documents to Sanity using
// `@sanity/client` with a write token.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/seed-article.ts <folder>
//
// where <folder> is the same folder name used with import-article.ts.
//
// Required env: SANITY_API_WRITE_TOKEN (Editor permission). Revoke at
// sanity.io/manage → API → Tokens after the seed completes.
//
// Idempotent: uses `createOrReplace`, so re-running with the same input is
// safe — existing docs are overwritten with the same content.
//
// Existence-aware cross-link patching: before writing the article, fetch the
// target IDs in `relatedArticles[]._ref` / `relatedProcedures[]._ref` and drop
// any that don't exist in the dataset. This makes the seeding order safe even
// when articles cross-reference each other (re-run a prior article to backfill
// once the target exists).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const folder = process.argv[2];
if (!folder) {
  console.error(
    'Usage: node --experimental-strip-types --env-file=.env.local scripts/seed-article.ts <folder>',
  );
  process.exit(1);
}

// Accept either env var name. SANITY_API_DEVELOPER_TOKEN is the convention
// the user has been using (broad read+write); SANITY_API_WRITE_TOKEN is the
// narrower name in earlier docs. Either works as long as the token has Editor
// permission. Per CLAUDE.md open item #1, revoke at sanity.io/manage after
// the seed completes.
const TOKEN =
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

const importPath = resolve(__dirname, `.${folder}-import.json`);
const importJson = JSON.parse(readFileSync(importPath, 'utf8'));

type Doc = { _id: string; _type: string; [k: string]: unknown };
type RefEntry = { _key?: string; _type: 'reference'; _ref: string };

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
  // the schema-correct slots so the byline renders cleanly.
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

  // Pass 2: patch in relatedTerms now that every target in this batch exists.
  // Filter out cross-package refs whose target is not yet in the dataset —
  // they'll resolve once the target package is seeded; re-run this seed then.
  console.log(`\n→ Patching glossaryTerm relatedTerms (pass 2)…`);
  for (const doc of docs) {
    const related = (doc as Doc & { relatedTerms?: RefEntry[] }).relatedTerms;
    if (!Array.isArray(related) || related.length === 0) continue;
    const before = related.length;
    const resolved = await filterExistingRefs(related);
    const dropped = before - resolved.length;
    if (dropped > 0) {
      console.log(
        `  ⚠ ${doc._id}: dropped ${dropped} relatedTerms ref(s) whose target does not yet exist`,
      );
    }
    if (resolved.length === 0) {
      // Nothing left to patch — unset the field so a previous run's stale
      // refs don't linger.
      try {
        await client.patch(doc._id).unset(['relatedTerms']).commit();
        process.stdout.write(`  ✓ ${doc._id} (no related — unset)\n`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${doc._id} relatedTerms unset — ${message}`);
        throw err;
      }
      continue;
    }
    try {
      await client.patch(doc._id).set({ relatedTerms: resolved }).commit();
      process.stdout.write(`  ✓ ${doc._id} (${resolved.length} related)\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${doc._id} relatedTerms — ${message}`);
      throw err;
    }
  }
}

// Resolve refs by `_id` first; for any unresolved, fall back to a slug-current
// lookup against the matching document type and rewrite the `_ref` to the live
// `_id`. This handles the legacy case where Phase-5 docs were seeded with UUID
// `_id`s and slug-form refs from the package would otherwise be filtered out.
async function filterExistingRefs(
  refs: RefEntry[],
  fallback?: { type: string; refPrefix: string },
): Promise<RefEntry[]> {
  if (refs.length === 0) return refs;
  const ids = refs.map((r) => r._ref);
  const existing = await client.fetch<string[]>(
    `*[_id in $ids]._id`,
    { ids },
  );
  const existingSet = new Set(existing);
  const resolved: RefEntry[] = [];
  for (const r of refs) {
    if (existingSet.has(r._ref)) {
      resolved.push(r);
      continue;
    }
    if (fallback) {
      // Treat the unresolved `_ref` as `<refPrefix><slug>` and look up by
      // slug.current. Handles legacy Phase-5 docs seeded with UUID `_id`s.
      const slugCandidate = r._ref.replace(new RegExp(`^${fallback.refPrefix}`), '');
      const liveId = await client.fetch<string | null>(
        `*[_type == $type && slug.current == $slug][0]._id`,
        { type: fallback.type, slug: slugCandidate },
      );
      if (liveId) {
        resolved.push({ ...r, _ref: liveId });
      }
    }
  }
  return resolved;
}

async function seedArticles(docs: Doc[]) {
  console.log(`\n→ Writing ${docs.length} article document(s) (with cross-link existence check)…`);
  for (const doc of docs) {
    const article = doc as Doc & {
      relatedArticles?: RefEntry[];
      relatedProcedures?: RefEntry[];
    };

    // Drop unresolved cross-links. Mention any drops so the user can re-seed
    // later to backfill the relationship once the target exists.
    if (article.relatedArticles && article.relatedArticles.length > 0) {
      const before = article.relatedArticles.length;
      article.relatedArticles = await filterExistingRefs(article.relatedArticles, { type: 'article', refPrefix: 'article-' });
      const dropped = before - article.relatedArticles.length;
      if (dropped > 0) {
        console.log(
          `  ⚠ ${doc._id}: dropped ${dropped} relatedArticles ref(s) whose target does not yet exist`,
        );
      }
      if (article.relatedArticles.length === 0) delete article.relatedArticles;
    }
    if (article.relatedProcedures && article.relatedProcedures.length > 0) {
      const before = article.relatedProcedures.length;
      article.relatedProcedures = await filterExistingRefs(article.relatedProcedures, { type: 'procedurePage', refPrefix: 'procedure-' });
      const dropped = before - article.relatedProcedures.length;
      if (dropped > 0) {
        console.log(
          `  ⚠ ${doc._id}: dropped ${dropped} relatedProcedures ref(s) whose target does not yet exist`,
        );
      }
      if (article.relatedProcedures.length === 0) delete article.relatedProcedures;
    }

    try {
      await client.createOrReplace(article);
      process.stdout.write(`  ✓ ${doc._id}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${doc._id} — ${message}`);
      throw err;
    }
  }
}

async function main() {
  console.log(`Seeding ${folder} content into Sanity (production)…`);

  await patchAuthor();
  await seed('bibReference', importJson.bibReferences);
  await seedGlossary(importJson.glossaryTerms);
  await seedArticles(importJson.articles);

  console.log('\n✓ Seed complete.');
  console.log('\nNext steps:');
  console.log('  1. Verify in Studio (npm run studio:dev) or via GROQ.');
  console.log(
    '  2. Revoke the write token at https://www.sanity.io/manage/project/' +
      (process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91') +
      '/api → Tokens.',
  );
  console.log('  3. cd site && npm run dev → http://localhost:4321/en/blog/<slug>');
  console.log(
    '  4. If this article cross-links to a not-yet-seeded sibling, re-run this seed once the target exists to backfill the relatedArticles ref.',
  );
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\nSeed failed:', message);
  process.exit(1);
});
