// site/scripts/preflight-delete-legacy-cts-patient.ts
//
// One-shot preflight for Part 2 of the CTS content drop. Deletes the legacy
// Phase-5 patient placeholder doc at slug `carpal-tunnel-syndrome` (UUID
// `_id`) so the new slug-form article doc can take the slug cleanly.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/preflight-delete-legacy-cts-patient.ts
//
// Idempotent: if the legacy doc already deleted, exits without error.

import { createClient } from '@sanity/client';

const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN;
if (!TOKEN) {
  console.error(
    'Error: no write token found. Add SANITY_API_DEVELOPER_TOKEN to .env.local.',
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

const TARGET_SLUG = 'carpal-tunnel-syndrome';
const NEW_ID = 'article-carpal-tunnel-syndrome';

const legacy = await client.fetch<{ _id: string; title?: string } | null>(
  `*[_type == "article" && slug.current == $slug && _id != $newId][0]{_id, title}`,
  { slug: TARGET_SLUG, newId: NEW_ID },
);

if (!legacy) {
  console.log(`No legacy doc at slug "${TARGET_SLUG}" — preflight is a no-op.`);
  process.exit(0);
}

console.log(`Found legacy article: _id=${legacy._id} title="${legacy.title ?? '(untitled)'}"`);

// Strip inbound references (e.g. FESSH article's relatedArticles[] entry
// resolved to this UUID via slug fallback). Delete fails with 409 otherwise.
const refSources = await client.fetch<{ _id: string; _type: string }[]>(
  `*[references($id)]{_id, _type}`,
  { id: legacy._id },
);
if (refSources.length > 0) {
  console.log(`Found ${refSources.length} doc(s) referencing the legacy doc. Patching them to drop the ref:`);
  for (const src of refSources) {
    console.log(`  - ${src._type} ${src._id}`);
    await client
      .patch(src._id)
      .unset([
        `relatedArticles[_ref=="${legacy._id}"]`,
        `relatedProcedures[_ref=="${legacy._id}"]`,
        `relatedTerms[_ref=="${legacy._id}"]`,
      ])
      .commit();
  }
  console.log(`✓ Stripped inbound references.`);
}

console.log(`Deleting legacy doc...`);
await client.delete(legacy._id);
console.log(`✓ Deleted ${legacy._id}. Slug "${TARGET_SLUG}" is now free for the new article.`);
console.log(`After Part 2 seed completes, re-run seed-article.ts on carpal-tunnel-syndrome-fessh-prep to backfill the relatedArticles[] ref to the new slug-form doc.`);
