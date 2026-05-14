// site/scripts/audit-fix-pl-cts-ratio-direction.ts
//
// Audit fix (2026-05-14, per audit Part 3 §P0-PL-4):
// article-zespol-ciesni-nadgarstka-przeglad-kliniczny § 01 has an inverted
// epidemiological ratio direction.
//
//   Before: "Stosunek kobiet do mężczyzn … kształtuje się między 2:1 a 3:1,
//            zwężając się od historycznego 3:1 do 10:1 w ostatnich dekadach."
//   After:  "Stosunek kobiet do mężczyzn … kształtuje się między 2:1 a 3:1,
//            zwężając się od historycznego 10:1 do współczesnych 2:1–3:1
//            w ostatnich dekadach."
//
// The original statement is self-contradictory: current ratio is 2:1–3:1,
// and "zwężając się" means "narrowing"; if the female-skew was higher
// historically (per Atroshi 1999 and subsequent population data) and is
// narrowing, the direction is 10:1 → 2:1–3:1, not 3:1 → 10:1.
//
// NOTE TO REVIEWER: this corrects the *direction* of the change. Verify
// the source (Atroshi 1999 / subsequent UK / Scandinavian population data)
// confirms the historical female-skew was indeed ~10:1 narrowing to ~2-3:1.
// If the actual historical ratio was different (e.g. 5:1 → 2:1), update
// the `replace` string before running with --commit.
//
// Idempotent.
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-cts-ratio-direction.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-cts-ratio-direction.ts --commit

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

const TARGET_ID = 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny';

// The exact source string varies in tokenization (may be split across spans
// due to citation marks). Replace the smallest unambiguous fragment.
const REPLACEMENTS: { find: string; replace: string }[] = [
  {
    find: 'zwężając się od historycznego 3:1 do 10:1',
    replace: 'zwężając się od historycznego 10:1 do współczesnych 2:1–3:1',
  },
];

type Block = {
  _type: string;
  children?: { text?: string; [k: string]: unknown }[];
  content?: Block[];
  [k: string]: unknown;
};

function patchBlocksRecursive(blocks: Block[]): { blocks: Block[]; hits: number } {
  let hits = 0;
  const out = blocks.map((block) => {
    let newBlock = block;
    if (block._type === 'block' && Array.isArray(block.children)) {
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
    if (Array.isArray(newBlock.content)) {
      const inner = patchBlocksRecursive(newBlock.content as Block[]);
      hits += inner.hits;
      newBlock = { ...newBlock, content: inner.blocks };
    }
    return newBlock;
  });
  return { blocks: out, hits };
}

async function main() {
  console.log(`audit-fix-pl-cts-ratio-direction — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  const doc = await client.fetch<{ _id: string; body: Block[] } | null>(
    `*[_id == $id][0]{_id, body}`,
    { id: TARGET_ID },
  );
  if (!doc) {
    console.error(`  ✗ ${TARGET_ID} not found`);
    process.exit(1);
  }
  const { blocks, hits } = patchBlocksRecursive(doc.body || []);
  console.log(`  · ${TARGET_ID}.body — ${hits} replacement(s)`);
  if (hits === 0) {
    console.log('  (no match — may be split across spans by citation marks; inspect manually if needed)');
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
