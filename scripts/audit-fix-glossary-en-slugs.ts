// site/scripts/audit-fix-glossary-en-slugs.ts
//
// Audit fix (2026-06-11, finding B8): two glossaryTerm docs were seeded with
// Polish slugs, violating the canonical-EN-slug rule (glossary docs are
// single-doc-bilingual; one EN slug serves both /en/glossary/<slug>/ and
// /pl/slowniczek/<slug>/). Re-slugs:
//
//   glossary-wyniki-raportowane-przez-pacjenta
//     wyniki-raportowane-przez-pacjenta → patient-reported-outcome-measures
//   glossary-guzek-dd
//     guzek-dd → dupuytrens-nodule
//
// The _id keeps its historical (Polish) slug-form — Sanity _ids are immutable
// without create+delete+repoint, and all inbound markDefs reference the _id,
// so they are unaffected. 301 redirects for the four old URLs (EN + PL per
// term) live in astro.config.mjs.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-glossary-en-slugs.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-glossary-en-slugs.ts --commit  # apply

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

const RESLUGS = [
  {
    id: 'glossary-wyniki-raportowane-przez-pacjenta',
    expect: 'wyniki-raportowane-przez-pacjenta',
    target: 'patient-reported-outcome-measures',
  },
  { id: 'glossary-guzek-dd', expect: 'guzek-dd', target: 'dupuytrens-nodule' },
];

let patched = 0;
let done = 0;
let skipped = 0;
for (const r of RESLUGS) {
  const doc = await client.fetch<{ slug: string } | null>(`*[_id == $id][0]{"slug": slug.current}`, {
    id: r.id,
  });
  if (!doc) {
    console.log(`  ✗ ${r.id} — not found, SKIP`);
    skipped++;
    continue;
  }
  if (doc.slug === r.target) {
    console.log(`  = ${r.id} — already "${r.target}" (no-op)`);
    done++;
    continue;
  }
  if (doc.slug !== r.expect) {
    console.log(`  ✗ ${r.id} — current slug "${doc.slug}" ≠ expected "${r.expect}"; SKIP`);
    skipped++;
    continue;
  }
  const collision = await client.fetch<number>(
    `count(*[_type=="glossaryTerm" && slug.current == $s && _id != $id])`,
    { s: r.target, id: r.id },
  );
  if (collision > 0) {
    console.log(`  ✗ ${r.id} — target slug "${r.target}" already taken; SKIP`);
    skipped++;
    continue;
  }
  console.log(`  · ${r.id}: slug "${r.expect}" → "${r.target}"`);
  if (COMMIT) {
    await client.patch(r.id).set({ 'slug.current': r.target }).commit();
    console.log('      ✓ committed');
  }
  patched++;
}
console.log(
  `\n${COMMIT ? 'COMMITTED' : 'DRY-RUN'} — ${patched} ${COMMIT ? 'patched' : 'to patch'}, ${done} already-correct, ${skipped} skipped.`,
);
if (skipped > 0) process.exitCode = 2;
