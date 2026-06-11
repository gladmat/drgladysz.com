// site/scripts/audit-fix-titles-sentence-case.ts
//
// Audit fix (2026-06-11): site rule is sentence case on on-page titles
// (memory feedback_article_title_no_audience_suffix). Four docs carry Title
// Case in their `title` field (linguistic.md D-1..D-4 / content-structural F6).
// Only the on-page `title` is touched — `seoTitle` is deliberately left alone.
//
//   article-flexor-tendon-injuries-and-repair  "Flexor Tendon Injuries and Repair" → "Flexor tendon injuries and repair"
//   procedurePage Open Carpal Tunnel Release   → "Open carpal tunnel release"
//   procedurePage Limited Fasciectomy          → "Limited fasciectomy"
//   procedurePage Percutaneous Needle Fasciotomy → "Percutaneous needle fasciotomy"
//
// Targets matched by _id; current value asserted before patch. Idempotent.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-titles-sentence-case.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-titles-sentence-case.ts --commit  # apply

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

type TitleEdit = { id: string; expectCurrent: string; target: string };

const EDITS: TitleEdit[] = [
  { id: 'article-flexor-tendon-injuries-and-repair', expectCurrent: 'Flexor Tendon Injuries and Repair', target: 'Flexor tendon injuries and repair' },
  // OCTR procedurePage carries a UUID _id (verified via GROQ).
  { id: 'e238943e-dc53-40ad-b02c-b4ba2ed07702', expectCurrent: 'Open Carpal Tunnel Release', target: 'Open carpal tunnel release' },
  { id: 'procedure-limited-fasciectomy', expectCurrent: 'Limited Fasciectomy', target: 'Limited fasciectomy' },
  { id: 'procedure-percutaneous-needle-fasciotomy', expectCurrent: 'Percutaneous Needle Fasciotomy', target: 'Percutaneous needle fasciotomy' },
];

async function main() {
  console.log(`audit-fix-titles-sentence-case — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  let patched = 0;
  let alreadyDone = 0;
  let skipped = 0;

  for (const edit of EDITS) {
    const doc = await client.fetch<{ _id: string; title: string | null } | null>(
      `*[_id == $id][0]{_id, title}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`  ✗ ${edit.id} — not found, skipping`);
      skipped++;
      continue;
    }
    if (doc.title === edit.target) {
      console.log(`  = ${edit.id} — title already "${edit.target}" (idempotent no-op)`);
      alreadyDone++;
      continue;
    }
    if (doc.title !== edit.expectCurrent) {
      console.log(`  ✗ ${edit.id} — title ${JSON.stringify(doc.title)} ≠ expected ${JSON.stringify(edit.expectCurrent)}; SKIPPING`);
      skipped++;
      continue;
    }
    console.log(`  · ${edit.id}: "${doc.title}" → "${edit.target}"`);
    if (COMMIT) {
      await client.patch(edit.id).set({ title: edit.target }).commit();
      console.log(`      ✓ committed`);
    }
    patched++;
  }

  console.log(`\n  Summary: ${patched} to patch, ${alreadyDone} already-correct, ${skipped} skipped.`);
  if (!COMMIT) console.log('  (dry-run — re-run with --commit to apply)');
  if (skipped > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
