// site/scripts/audit-fix-fessh-firstpublished.ts
//
// Audit fix (2026-06-11): backfill `metadata.firstPublishedDate` on fesshMcq
// docs that are missing it. The learn-app renderer
// (learn/src/components/FesshQuestion.tsx → QuestionMetadata) reads
// `meta?.firstPublishedDate` (path: metadata.firstPublishedDate) and renders a
// "First published" line; docs without it silently drop that audit-trail line.
//
// 27 fesshMcq total; the 2026-05-03 backfill (learn/scripts/backfill-fessh-metadata.ts)
// already set 8, leaving 19 missing. This sets firstPublishedDate to the DATE
// portion of each doc's _createdAt. Only sets when missing — idempotent.
//
// Field path confirmed against learn/src/lib/sanity.ts (SanityFesshMcqMetadata.firstPublishedDate)
// and the GROQ `metadata` projection used by the published-MCQ queries.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-fessh-firstpublished.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-fessh-firstpublished.ts --commit  # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN =
  process.env.SANITY_API_EDITOR_TOKEN ||
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing SANITY_API_EDITOR_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

type McqRow = {
  _id: string;
  _createdAt: string;
  firstPublishedDate: string | null;
};

async function main() {
  console.log(`audit-fix-fessh-firstpublished — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  const docs = await client.fetch<McqRow[]>(
    `*[_type == "fesshMcq"]{_id, _createdAt, "firstPublishedDate": metadata.firstPublishedDate} | order(_id asc)`,
  );

  console.log(`  Found ${docs.length} fesshMcq docs.`);
  const missing = docs.filter((d) => !d.firstPublishedDate);
  const present = docs.length - missing.length;
  console.log(`  ${present} already have firstPublishedDate; ${missing.length} missing.\n`);

  let patched = 0;
  for (const d of missing) {
    const date = (d._createdAt || '').slice(0, 10); // YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.log(`  ✗ ${d._id} — could not derive date from _createdAt=${JSON.stringify(d._createdAt)}; skipping`);
      continue;
    }
    console.log(`  · ${d._id}: metadata.firstPublishedDate → ${date}  (from _createdAt)`);
    if (COMMIT) {
      // Dot-path set; metadata object already exists on every doc.
      await client.patch(d._id).set({ 'metadata.firstPublishedDate': date }).commit();
      console.log(`      ✓ committed`);
    }
    patched++;
  }

  console.log(`\n  Summary: ${patched} backfilled, ${present} already-set.`);
  if (!COMMIT) console.log('  (dry-run — re-run with --commit to apply)');
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
