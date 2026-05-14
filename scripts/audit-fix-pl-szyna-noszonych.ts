// site/scripts/audit-fix-pl-szyna-noszonych.ts
//
// Audit fix (2026-05-14, per audit Part 3 §P0-PL-3):
// procedure-fasciektomia-ograniczona, `aftercare` section, Doba 0–7:
//
//   Before: "szyna w pozycji wyprostnej noszonych całodobowo"
//   After:  "szyna w pozycji wyprostnej noszona całodobowo"
//
// `szyna` (feminine singular nominative) needs `noszona` (matching feminine
// singular). `noszonych` is genitive/locative plural — wrong number AND gender.
//
// Idempotent.
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-szyna-noszonych.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-szyna-noszonych.ts --commit

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

const TARGET_ID = 'procedure-fasciektomia-ograniczona';
const TARGET_FIELD = 'aftercare';
const REPLACEMENTS: { find: string; replace: string }[] = [
  { find: 'noszonych całodobowo', replace: 'noszona całodobowo' },
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
  console.log(`audit-fix-pl-szyna-noszonych — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  const doc = await client.fetch<{ _id: string; aftercare: Block[] } | null>(
    `*[_id == $id][0]{_id, ${TARGET_FIELD}}`,
    { id: TARGET_ID },
  );
  if (!doc) {
    console.error(`  ✗ ${TARGET_ID} not found`);
    process.exit(1);
  }
  const { blocks, hits } = patchBlocksRecursive(doc[TARGET_FIELD] || []);
  console.log(`  · ${TARGET_ID}.${TARGET_FIELD} — ${hits} replacement(s)`);
  if (hits === 0) {
    console.log('  (nothing to do — already corrected?)');
    return;
  }
  if (!COMMIT) {
    console.log('\n(dry-run — re-run with --commit to apply)');
    return;
  }
  await client.patch(TARGET_ID).set({ [TARGET_FIELD]: blocks }).commit();
  console.log(`  ✓ committed`);
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
