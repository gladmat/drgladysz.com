// site/scripts/audit-fix-seo-descriptions.ts
//
// Audit fix (2026-06-11): SEO field cleanup from linguistic.md (B-21/28/29/33/34,
// D-6, D-8). Three kinds of edit, all asserting the current value before patch:
//
//  TRIM  — field truncated mid-word/mid-string; trim to last full word / drop the
//          truncated trailing fragment so it reads naturally and stays ≤158 (desc)
//          or loses the stray cut (title). Mechanical.
//  AUTHOR — field was null; a concise ≤158-char sentence-case description is
//           authored from the article excerpt/standfirst. Flagged for user review.
//
// Edits:
//  [TRIM] article-choroba-dupuytrena-leczenie-operacyjne seoTitle
//         "…| Mateusz Gładysz, " → "…| Mateusz Gładysz"  (drop trailing ", ")
//  [TRIM] procedure-aponeurotomia-iglowa-przezskorna seoTitle
//         "…| Mateusz Głady" → "…| Mateusz Gładysz"  (complete the obvious word)
//  [TRIM] procedure-aponeurotomia-iglowa-przezskorna seoDescription
//         drop the truncated trailing "Strona zabiegowa wg AO Surgery Refer" fragment
//  [TRIM] procedure-fasciektomia-ograniczona seoTitle
//         "…| Mateusz Gład" → "…| Mateusz Gładysz"  (complete the obvious word)
//  [TRIM] procedure-fasciektomia-ograniczona seoDescription
//         drop the truncated trailing "według struktury AO Surge" fragment
//  [TRIM] OCTR (e238943e…) seoDescription  183 chars → drop trailing sentence, ≤158
//  [AUTHOR] article-dupuytrens-disease-fessh-prep      seoDescription (was null)
//  [AUTHOR] article-dupuytrens-disease-patient-guide   seoDescription (was null)
//
// NOT in scope (flagged in audit D-7 but not in this fix batch): the two CTS EN
// seoDescriptions at 160 chars ("Written by a hand surgeon" / "recurrent C").
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-seo-descriptions.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-seo-descriptions.ts --commit  # apply

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

type Kind = 'TRIM' | 'AUTHOR';
type SeoEdit = {
  id: string;
  field: 'seoTitle' | 'seoDescription';
  kind: Kind;
  expectCurrent: string | null;
  target: string;
};

const EDITS: SeoEdit[] = [
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    field: 'seoTitle',
    kind: 'TRIM',
    expectCurrent: 'Choroba Dupuytrena — leczenie operacyjne | Mateusz Gładysz, ',
    target: 'Choroba Dupuytrena — leczenie operacyjne | Mateusz Gładysz',
  },
  {
    id: 'procedure-aponeurotomia-iglowa-przezskorna',
    field: 'seoTitle',
    kind: 'TRIM',
    expectCurrent: 'Aponeurotomia igłowa przezskórna — Dupuytren | Mateusz Głady',
    target: 'Aponeurotomia igłowa przezskórna — Dupuytren | Mateusz Gładysz',
  },
  {
    id: 'procedure-aponeurotomia-iglowa-przezskorna',
    field: 'seoDescription',
    kind: 'TRIM',
    expectCurrent: 'Aponeurotomia igłowa przezskórna w chorobie Dupuytrena — wskazania, technika, nawrót, anatomia bezpiecznych stref iniekcji. Strona zabiegowa wg AO Surgery Refer',
    target: 'Aponeurotomia igłowa przezskórna w chorobie Dupuytrena — wskazania, technika, nawrót i anatomia bezpiecznych stref iniekcji.',
  },
  {
    id: 'procedure-fasciektomia-ograniczona',
    field: 'seoTitle',
    kind: 'TRIM',
    expectCurrent: 'Fasciektomia ograniczona — choroba Dupuytrena | Mateusz Gład',
    target: 'Fasciektomia ograniczona — choroba Dupuytrena | Mateusz Gładysz',
  },
  {
    id: 'procedure-fasciektomia-ograniczona',
    field: 'seoDescription',
    kind: 'TRIM',
    expectCurrent: 'Fasciektomia ograniczona w chorobie Dupuytrena — anatomia, technika operacyjna, postępowanie pooperacyjne, powikłania i dowody naukowe według struktury AO Surge',
    target: 'Fasciektomia ograniczona w chorobie Dupuytrena — anatomia, technika operacyjna, postępowanie pooperacyjne, powikłania i dowody naukowe.',
  },
  {
    id: 'e238943e-dc53-40ad-b02c-b4ba2ed07702', // OCTR procedurePage
    field: 'seoDescription',
    kind: 'TRIM',
    expectCurrent: 'Open release of the transverse carpal ligament — indications, anatomy, key surgical steps with technique pitfalls, aftercare, and complications. Authored by a consultant hand surgeon.',
    target: 'Open release of the transverse carpal ligament — indications, anatomy, key surgical steps with technique pitfalls, aftercare, and complications.',
  },
  // AUTHORED — null → new copy (≤158, sentence case, factual). FLAG for user review.
  {
    id: 'article-dupuytrens-disease-fessh-prep',
    field: 'seoDescription',
    kind: 'AUTHOR',
    expectCurrent: null,
    target: "Expert review of Dupuytren's disease for FESSH candidates and peers — anatomy, McFarlane cord patterns, treatment after collagenase withdrawal, recurrence.",
  },
  {
    id: 'article-dupuytrens-disease-patient-guide',
    field: 'seoDescription',
    kind: 'AUTHOR',
    expectCurrent: null,
    target: "A plain-language patient guide to Dupuytren's disease — causes, diagnosis, and treatment options including needle fasciotomy and limited fasciectomy.",
  },
];

async function main() {
  console.log(`audit-fix-seo-descriptions — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  let patched = 0;
  let alreadyDone = 0;
  let skipped = 0;
  const authored: { id: string; field: string; text: string; len: number }[] = [];

  for (const edit of EDITS) {
    const doc = await client.fetch<{ _id: string; value: string | null } | null>(
      `*[_id == $id][0]{_id, "value": ${edit.field}}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`  ✗ ${edit.id} — not found, skipping`);
      skipped++;
      continue;
    }
    const current = (doc.value ?? null) as string | null;

    if (current === edit.target) {
      console.log(`  = ${edit.id}.${edit.field} — already target (idempotent no-op)`);
      alreadyDone++;
      continue;
    }
    if (current !== edit.expectCurrent) {
      console.log(
        `  ✗ ${edit.id}.${edit.field} — current ${JSON.stringify((current ?? '').slice(0, 50))}… ` +
        `≠ expected; SKIPPING`,
      );
      skipped++;
      continue;
    }
    const len = edit.target.length;
    const tag = edit.kind === 'AUTHOR' ? '[AUTHOR — review]' : '[TRIM]';
    console.log(`  · ${edit.id}.${edit.field} ${tag} (→ ${len} chars)`);
    console.log(`      "${edit.target}"`);
    if (edit.kind === 'AUTHOR') authored.push({ id: edit.id, field: edit.field, text: edit.target, len });
    if (COMMIT) {
      await client.patch(edit.id).set({ [edit.field]: edit.target }).commit();
      console.log(`      ✓ committed`);
    }
    patched++;
  }

  console.log(`\n  Summary: ${patched} to patch, ${alreadyDone} already-correct, ${skipped} skipped.`);
  if (authored.length) {
    console.log(`\n  AUTHORED descriptions (need user review):`);
    for (const a of authored) console.log(`    - ${a.id} (${a.len} chars): ${a.text}`);
  }
  if (!COMMIT) console.log('\n  (dry-run — re-run with --commit to apply)');
  if (skipped > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
