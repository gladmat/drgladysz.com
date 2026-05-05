// site/scripts/audit-fix-language-field.ts
//
// Pre-existing-issue cleanup (2026-05-05 session audit, finding 10): 5 articles
// + 1 procedure (Phase-5 era docs) lack the schema-required `language` field.
// They've been rendering on EN routes via the locale-aware GROQ pattern
// `language == "en" || !defined(language)`, but the schema-required field is
// undeclared on those docs. This script sets `language: 'en'` on every
// undefined doc.
//
// Idempotent — uses setIfMissing.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/audit-fix-language-field.ts

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

async function main() {
  for (const [type, label] of [
    ['article', 'articles'],
    ['procedurePage', 'procedures'],
  ] as const) {
    const ids = await client.fetch<string[]>(
      '*[_type == $t && !defined(language)]._id',
      { t: type },
    );
    console.log(`Found ${ids.length} ${label} lacking the language field`);
    for (const id of ids) {
      await client.patch(id).setIfMissing({ language: 'en' }).commit();
      console.log(`  ✓ ${id} → language: 'en'`);
    }
  }
  console.log('\n✓ Done.');
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
