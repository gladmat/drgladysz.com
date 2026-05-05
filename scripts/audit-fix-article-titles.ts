// site/scripts/audit-fix-article-titles.ts
//
// Title cleanup (2026-05-05): the blog index renders category twice (as an
// h2 section heading AND a card-cat badge), so the audience-suffix on each
// article title was visually redundant. This script removes the audience
// suffix from the on-page title while preserving / backfilling seoTitle so
// the SEO/browser-tab text still disambiguates the two patient + two FESSH-
// prep entries for Dupuytren and CTS.
//
// Also normalises the CTS patient title from Title Case to sentence case so
// it matches the rest of the site's convention.
//
// Idempotent (uses set; safe to re-run).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/audit-fix-article-titles.ts

import { createClient } from '@sanity/client';

const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (!TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN,
  useCdn: false,
});

const PATCHES: Array<{
  id: string;
  title: string;
  seoTitle: string;
  note: string;
}> = [
  {
    id: 'article-dupuytrens-disease-patient-guide',
    title: "Dupuytren's disease",
    seoTitle: "Dupuytren's disease — a guide for patients",
    note: 'Drop "— a guide for patients" suffix; backfill seoTitle for SEO disambiguation',
  },
  {
    id: 'article-dupuytrens-disease-fessh-prep',
    title: "Dupuytren's disease",
    seoTitle: "Dupuytren's disease — FESSH preparation",
    note: 'Drop "— a FESSH preparation article" suffix; backfill seoTitle',
  },
  {
    id: 'article-carpal-tunnel-syndrome',
    title: 'Carpal tunnel syndrome',
    seoTitle: "Carpal tunnel syndrome — a patient's guide",
    note: 'Sentence-case normalisation; drop suffix; normalise seoTitle to match',
  },
  {
    id: 'article-carpal-tunnel-syndrome-fessh-prep',
    title: 'Carpal tunnel syndrome',
    seoTitle: 'Carpal tunnel syndrome — FESSH preparation',
    note: 'Drop "— a FESSH preparation article" suffix; seoTitle already set',
  },
  {
    id: 'article-choroba-dupuytrena',
    title: 'Choroba Dupuytrena (przykurcz Dupuytrena)',
    seoTitle: 'Choroba Dupuytrena — informacje dla pacjentów',
    note: 'Drop "— informacje dla pacjentów" suffix; keep parens (synonym expansion); seoTitle already set',
  },
];

async function main() {
  for (const p of PATCHES) {
    console.log(`\n→ ${p.id}`);
    console.log(`   ${p.note}`);
    const before = await client.fetch<{ title: string; seoTitle: string | null } | null>(
      '*[_id == $id][0]{title, seoTitle}',
      { id: p.id },
    );
    if (!before) {
      console.error(`  ✗ doc not found`);
      continue;
    }
    console.log(`   title:    "${before.title}" → "${p.title}"`);
    console.log(`   seoTitle: "${before.seoTitle ?? '(unset)'}" → "${p.seoTitle}"`);
    await client.patch(p.id).set({ title: p.title, seoTitle: p.seoTitle }).commit();
    console.log(`   ✓ patched`);
  }
  console.log('\n✓ Done.');
}

main().catch((err) => {
  console.error('\n✗ Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
