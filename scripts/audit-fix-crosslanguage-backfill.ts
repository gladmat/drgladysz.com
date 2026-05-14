// site/scripts/audit-fix-crosslanguage-backfill.ts
//
// Audit fix (2026-05-14): backfill the `crossLanguageRef` field on every
// existing EN ↔ PL article/procedure pair. Replaces the hand-edited
// EN_TO_PL_SLUG / PL_TO_EN_SLUG maps that previously lived in the page
// templates.
//
// Pre-requisite: deploy the extended article + procedurePage schemas first
// (they gained `crossLanguageRef` fields):
//   cd site && npx sanity@latest schema deploy
//
// Pairs (canonical, EN slug → PL slug):
//   Articles:
//     carpal-tunnel-syndrome                ↔ zespol-ciesni-nadgarstka
//     carpal-tunnel-syndrome-fessh-prep     ↔ zespol-ciesni-nadgarstka-przeglad-kliniczny
//     dupuytrens-disease-patient-guide      ↔ choroba-dupuytrena
//     free-tissue-transfer                  ↔ wolne-platy
//   Procedures:
//     open-carpal-tunnel-release            ↔ zespol-ciesni-nadgarstka
//     limited-fasciectomy                   ↔ fasciektomia-ograniczona
//     percutaneous-needle-fasciotomy        ↔ aponeurotomia-iglowa-przezskorna
//
// Idempotent. Sets `crossLanguageRef` in both directions for each pair.
// Resolves slugs to live document `_id`s before patching, so the script
// survives slug-to-_id mapping changes (slug-form _id convention or UUID).
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-crosslanguage-backfill.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-crosslanguage-backfill.ts --commit

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

const ARTICLE_PAIRS: { en: string; pl: string }[] = [
  { en: 'carpal-tunnel-syndrome', pl: 'zespol-ciesni-nadgarstka' },
  { en: 'carpal-tunnel-syndrome-fessh-prep', pl: 'zespol-ciesni-nadgarstka-przeglad-kliniczny' },
  { en: 'dupuytrens-disease-patient-guide', pl: 'choroba-dupuytrena' },
  { en: 'free-tissue-transfer', pl: 'wolne-platy' },
];

const PROCEDURE_PAIRS: { en: string; pl: string }[] = [
  { en: 'open-carpal-tunnel-release', pl: 'zespol-ciesni-nadgarstka' },
  { en: 'limited-fasciectomy', pl: 'fasciektomia-ograniczona' },
  { en: 'percutaneous-needle-fasciotomy', pl: 'aponeurotomia-iglowa-przezskorna' },
];

async function resolveSlug(
  docType: 'article' | 'procedurePage',
  slug: string,
  expectedLang: 'en' | 'pl',
): Promise<string | null> {
  const doc = await client.fetch<{ _id: string; language?: string } | null>(
    `*[_type == $docType && slug.current == $slug][0]{_id, language}`,
    { docType, slug },
  );
  if (!doc) return null;
  // language field is optional on pre-language-field docs; for those we treat
  // missing language as 'en'.
  const lang = doc.language ?? 'en';
  if (lang !== expectedLang) {
    console.warn(
      `  ⚠ ${docType} slug "${slug}" resolved but language="${lang}" != expected "${expectedLang}"`,
    );
    return null;
  }
  return doc._id;
}

async function patchPair(
  docType: 'article' | 'procedurePage',
  pair: { en: string; pl: string },
) {
  const enId = await resolveSlug(docType, pair.en, 'en');
  const plId = await resolveSlug(docType, pair.pl, 'pl');
  if (!enId || !plId) {
    console.log(
      `  · ${docType}: ${pair.en} ↔ ${pair.pl} — SKIP (en=${enId}, pl=${plId})`,
    );
    return;
  }
  console.log(`  · ${docType}: ${pair.en} (${enId}) ↔ ${pair.pl} (${plId})`);
  if (!COMMIT) return;
  await Promise.all([
    client
      .patch(enId)
      .set({ crossLanguageRef: { _type: 'reference', _ref: plId } })
      .commit(),
    client
      .patch(plId)
      .set({ crossLanguageRef: { _type: 'reference', _ref: enId } })
      .commit(),
  ]);
  console.log(`    ✓ both sides committed`);
}

async function main() {
  console.log(
    `audit-fix-crosslanguage-backfill — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`,
  );
  console.log('\nArticles:');
  for (const pair of ARTICLE_PAIRS) {
    await patchPair('article', pair);
  }
  console.log('\nProcedures:');
  for (const pair of PROCEDURE_PAIRS) {
    await patchPair('procedurePage', pair);
  }
  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((err) => {
  console.error('\n✗ Backfill failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
