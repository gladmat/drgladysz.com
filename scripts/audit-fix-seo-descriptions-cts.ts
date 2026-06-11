// site/scripts/audit-fix-seo-descriptions-cts.ts
//
// Audit fix (2026-06-11), follow-up to audit-fix-seo-descriptions.ts which
// covered only Dupuytren docs + OCTR. linguistic.md finding D-7: two EN CTS
// article seoDescriptions sit at exactly 160 chars and are visibly truncated
// at source (the layout's auto-trim then cuts them again at render). Both are
// TRIM edits — rewritten to natural complete sentences ≤158, sentence case.
// Current value asserted before patch; idempotent.
//
//  [TRIM] article-carpal-tunnel-syndrome (patient)
//         drop the cut "Written by a hand surgeon" tail; end at "right step."
//  [TRIM] article-carpal-tunnel-syndrome-fessh-prep (fessh-prep)
//         complete the mid-word "recurrent C"; keep FESSH-prep audience cue.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-seo-descriptions-cts.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-seo-descriptions-cts.ts --commit  # apply

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

type SeoEdit = { id: string; field: 'seoDescription'; expectCurrent: string; target: string };

const EDITS: SeoEdit[] = [
  {
    id: 'article-carpal-tunnel-syndrome',
    field: 'seoDescription',
    expectCurrent:
      'A plain-language patient guide to carpal tunnel syndrome — symptoms, diagnosis, conservative care, and when surgery is the right step. Written by a hand surgeon',
    target:
      'A plain-language patient guide to carpal tunnel syndrome — symptoms, diagnosis, conservative care, and when surgery is the right step.',
  },
  {
    id: 'article-carpal-tunnel-syndrome-fessh-prep',
    field: 'seoDescription',
    expectCurrent:
      'Expert review of carpal tunnel syndrome for FESSH candidates and consultant peers — anatomy, diagnosis, AAOS 2024 guideline, surgical controversies, recurrent C',
    target:
      'Expert review of carpal tunnel syndrome for FESSH candidates and consultant peers — anatomy, diagnosis, AAOS 2024 guideline, surgery, and recurrent disease.',
  },
];

async function main() {
  console.log(`audit-fix-seo-descriptions-cts — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);
  let patched = 0;
  let alreadyDone = 0;
  let skipped = 0;

  for (const edit of EDITS) {
    const doc = await client.fetch<{ value: string | null } | null>(
      `*[_id == $id][0]{"value": ${edit.field}}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`  ✗ ${edit.id} — not found, skipping`);
      skipped++;
      continue;
    }
    const current = (doc.value ?? null) as string | null;
    if (current === edit.target) {
      console.log(`  = ${edit.id} — already target (idempotent no-op)`);
      alreadyDone++;
      continue;
    }
    if (current !== edit.expectCurrent) {
      console.log(
        `  ✗ ${edit.id} — current ${JSON.stringify((current ?? '').slice(0, 50))}… ≠ expected; SKIPPING`,
      );
      skipped++;
      continue;
    }
    console.log(`  · ${edit.id} [TRIM] (→ ${edit.target.length} chars)`);
    console.log(`      "${edit.target}"`);
    if (COMMIT) {
      await client.patch(edit.id).set({ [edit.field]: edit.target }).commit();
      console.log('      ✓ committed');
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
