// site/scripts/audit-fix-glossary-tped-polish.ts
//
// Post-seed audit fix (2026-05-05): the PL Dupuytren expert article body uses
// `[gloss:całkowity bierny deficyt wyprostu|...]` which the seed's hand-tuned
// alias map resolves to the existing EN doc `glossary-tped`. The doc had no
// Polish content (`termPolish` and `shortDefinitionPolish` both null) so
// tooltips on /pl/ pages fell back to English.
//
// This script patches `glossary-tped` with the canonical Polish fields. The
// PL glossary YAML at 01-brand-system/inbox/_archive/Dupuytren PL/05-glossary-
// terms.yaml has been updated with a matching entry so any future re-run of
// `seed-dupuytren-pl-package.ts` patches the same way.
//
// Idempotent (uses set, not setIfMissing — safe to re-run).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/audit-fix-glossary-tped-polish.ts

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

const TERM_POLISH = 'całkowity bierny deficyt wyprostu';
const SHORT_DEF_POLISH =
  'Suma utrwalonego zgięciowego deficytu w stawach śródręczno-paliczkowym (MCP), międzypaliczkowym bliższym (PIP) i międzypaliczkowym dalszym (DIP) zajętego promienia, mierzona goniometrem przy maksymalnej próbie wyprostu. Główny pomiar goniometryczny w piśmiennictwie operacyjnym choroby Dupuytrena, w tym w RCT van Rijssen 2012.';
const NEW_SYNONYMS = ['całkowity deficyt wyprostu', 'TFD'];

async function main() {
  console.log('Patching glossary-tped with Polish fields…');

  // Merge synonyms with existing list (avoid duplicates).
  const existing = await client.fetch<{ synonyms?: string[] } | null>(
    '*[_id == "glossary-tped"][0]{synonyms}',
  );
  const existingSyn = existing?.synonyms ?? [];
  const mergedSyn = Array.from(new Set([...existingSyn, ...NEW_SYNONYMS]));

  await client
    .patch('glossary-tped')
    .set({
      termPolish: TERM_POLISH,
      shortDefinitionPolish: SHORT_DEF_POLISH,
      synonyms: mergedSyn,
    })
    .commit();

  console.log('  ✓ glossary-tped patched');
  console.log(`    termPolish: "${TERM_POLISH}"`);
  console.log(`    shortDefinitionPolish: ${SHORT_DEF_POLISH.length} chars`);
  console.log(`    synonyms: ${mergedSyn.join(', ')}`);
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
