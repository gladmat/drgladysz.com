// site/scripts/audit-fix-pl-rozciegno-genitive.ts
//
// Audit fix (2026-05-14, per audit Part 3 §P0-PL-1): two PL articles use
// `rozcięgno dłoniowe` (nominative) in syntactic positions that require
// the genitive `rozcięgna dłoniowego`.
//
//   article-choroba-dupuytrena § 01:
//     "Zmiana dotyczy rozcięgno dłoniowe"      → dotyczy + GEN
//   article-choroba-dupuytrena-leczenie-operacyjne § 01:
//     "choroba rozcięgno dłoniowe i powięzi…"  → choroba [czego?] + GEN
//
// Czasownik `dotyczyć` wymaga dopełniacza; rzeczownik `choroba` w
// konstrukcji "choroba czego" — także dopełniacza.
//
// The fix is a straight string replacement on body span text. Glossary
// marks (markDefs referencing `glossary-rozciegno-dloniowe`) reference
// by slug-form _id, NOT by display text, so the slug is unaffected.
//
// Idempotent (re-running after a successful patch is a no-op — the
// nominative string is no longer present).
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-rozciegno-genitive.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-rozciegno-genitive.ts --commit # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN. Pass --commit only when env is set.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

// The display text `rozcięgno dłoniowe` lives in a glossary-marked span
// (its own atomic span — verified via GROQ). The surrounding sentence
// requires the genitive, so we change the display text in-place. The
// glossary slug `rozciegno-dloniowe` is unaffected (lives in markDefs,
// not the span text). Per-doc verification confirmed: each target article
// contains this exact span text exactly once, in genitive context.
const REPLACEMENTS: { find: string; replace: string }[] = [
  { find: 'rozcięgno dłoniowe', replace: 'rozcięgna dłoniowego' },
];

const TARGETS: { id: string; field: 'body' }[] = [
  { id: 'article-choroba-dupuytrena', field: 'body' },
  { id: 'article-choroba-dupuytrena-leczenie-operacyjne', field: 'body' },
];

type Block = {
  _type: string;
  _key?: string;
  children?: { _type?: string; text?: string; _key?: string; marks?: string[] }[];
  content?: Block[]; // for callouts
  [k: string]: unknown;
};

function patchBlocksRecursive(blocks: Block[]): { blocks: Block[]; hits: number } {
  let hits = 0;
  const out = blocks.map((block) => {
    let newBlock: Block = block;
    if (block._type === 'block' && Array.isArray(block.children)) {
      const newChildren = block.children.map((child) => {
        if (typeof child.text !== 'string') return child;
        let text = child.text;
        for (const { find, replace } of REPLACEMENTS) {
          if (text.includes(find)) {
            const count = text.split(find).length - 1;
            hits += count;
            text = text.split(find).join(replace);
          }
        }
        return text === child.text ? child : { ...child, text };
      });
      newBlock = { ...block, children: newChildren };
    }
    if (Array.isArray((newBlock as Block).content)) {
      const inner = patchBlocksRecursive((newBlock as Block).content as Block[]);
      hits += inner.hits;
      newBlock = { ...newBlock, content: inner.blocks };
    }
    return newBlock;
  });
  return { blocks: out, hits };
}

async function main() {
  console.log(`audit-fix-pl-rozciegno-genitive — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  for (const t of TARGETS) {
    const doc = await client.fetch<{ _id: string; body: Block[] } | null>(
      `*[_id == $id][0]{_id, body}`,
      { id: t.id },
    );
    if (!doc) {
      console.log(`  · ${t.id} — not found, skipping`);
      continue;
    }
    const { blocks, hits } = patchBlocksRecursive(doc.body || []);
    console.log(`  · ${t.id} — ${hits} replacement(s)`);
    if (hits === 0) continue;
    if (!COMMIT) continue;
    await client.patch(t.id).set({ body: blocks }).commit();
    console.log(`    ✓ committed`);
  }
  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
