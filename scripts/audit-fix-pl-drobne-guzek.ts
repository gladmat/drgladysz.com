// site/scripts/audit-fix-pl-drobne-guzek.ts
//
// Audit fix (2026-05-14, per audit Part 3 §P0-PL-2): article-choroba-dupuytrena
// § 01 has two gender-agreement issues in one sentence:
//
//   Before: "tworząc najpierw drobne guzek (DD) pod skórą"
//   After:  "tworząc najpierw drobny guzek pod skórą"
//
// Two fixes:
//   1. `drobne` (neuter or plural) → `drobny` (masculine sing.) — agrees with
//      `guzek` (masc. sing. nominative).
//   2. Drop the unintroduced English `(DD)` abbreviation — the sentence is
//      already about choroba Dupuytrena; the parenthetical adds noise.
//
// Idempotent.
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-drobne-guzek.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-drobne-guzek.ts --commit

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

// The full sentence text "tworząc najpierw drobne guzek (DD)" is split
// across two spans (verified via GROQ):
//   span s7 (no marks): "...tworząc najpierw drobne "
//   span s8 (g3 glossary mark): "guzek (DD)"
// So a phrase-spanning replacement won't match in per-span iteration. We
// apply two separate substring replacements scoped to block b4 only — the
// surrounding article has other (correct) uses of "drobne" (e.g. neuter
// "drobne zgrubienie" in block b8) that must not be touched.
const TARGET_ID = 'article-choroba-dupuytrena';
const TARGET_BLOCK_KEY = 'b4';
const REPLACEMENTS: { find: string; replace: string }[] = [
  { find: 'drobne ', replace: 'drobny ' },
  { find: 'guzek (DD)', replace: 'guzek' },
];

type Block = {
  _type: string;
  _key?: string;
  children?: { text?: string; [k: string]: unknown }[];
  content?: Block[];
  [k: string]: unknown;
};

function patchBlocksRecursive(blocks: Block[]): { blocks: Block[]; hits: number } {
  let hits = 0;
  const out = blocks.map((block) => {
    let newBlock = block;
    // Scope to target block only — surrounding article has innocent uses
    // of "drobne" that must NOT be changed.
    if (
      block._type === 'block' &&
      block._key === TARGET_BLOCK_KEY &&
      Array.isArray(block.children)
    ) {
      const newChildren = block.children.map((child) => {
        if (typeof child.text !== 'string') return child;
        let text = child.text;
        for (const { find, replace } of REPLACEMENTS) {
          if (text.includes(find)) {
            hits += text.split(find).length - 1;
            text = text.split(find).join(replace);
          }
        }
        return text === child.text ? child : { ...child, text };
      });
      newBlock = { ...block, children: newChildren };
    }
    return newBlock;
  });
  return { blocks: out, hits };
}

async function main() {
  console.log(`audit-fix-pl-drobne-guzek — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  const doc = await client.fetch<{ _id: string; body: Block[] } | null>(
    `*[_id == $id][0]{_id, body}`,
    { id: TARGET_ID },
  );
  if (!doc) {
    console.error(`  ✗ ${TARGET_ID} not found`);
    process.exit(1);
  }
  const { blocks, hits } = patchBlocksRecursive(doc.body || []);
  console.log(`  · ${TARGET_ID} — ${hits} replacement(s)`);
  if (hits === 0) {
    console.log('  (nothing to do — already corrected?)');
    return;
  }
  if (!COMMIT) {
    console.log('\n(dry-run — re-run with --commit to apply)');
    return;
  }
  await client.patch(TARGET_ID).set({ body: blocks }).commit();
  console.log(`  ✓ committed`);
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
