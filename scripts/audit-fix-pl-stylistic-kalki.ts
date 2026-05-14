// site/scripts/audit-fix-pl-stylistic-kalki.ts
//
// Audit fix (2026-05-14, per audit Part 3 §P1-PL-1 through P1-PL-5):
// five P1 stylistic kalki / non-idiomatic constructions in PL content.
//
// Patches multiple docs in one run. Each replacement is scoped to a specific
// doc + field where the audit found the issue:
//
// 1. procedure-zespol-ciesni-nadgarstka.aftercare (×2 occurrences):
//    "na podstawie tego, że" → "uzasadniając to tym, że"
//
// 2. glossary-complex-regional-pain-syndrome.termPolish:
//    "zespół wieloobjawowego bólu miejscowego (CRPS)"
//      → "kompleksowy zespół bólu regionalnego (CRPS)"
//
// 3. article-zespol-ciesni-nadgarstka-przewodnik-dla-pacjentow.body:
//    "potrzebuje rozprostować palce" → "musi rozprostować palce"
//    "z ręki 'odrętwiałej'" → "z odrętwiałą ręką"
//
// 4. article-choroba-dupuytrena-leczenie-operacyjne.body:
//    "wcześniej traktowana jedynie jako skojarzenie"
//      → "wcześniej traktowana jedynie jako korelacja"
//    "85 wariantami w 56 lokus" → "85 wariantami w 56 lokusach"
//
// Idempotent.
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-stylistic-kalki.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-stylistic-kalki.ts --commit

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

type Block = {
  _type: string;
  children?: { text?: string; [k: string]: unknown }[];
  content?: Block[];
  [k: string]: unknown;
};

type PortableTextEdit = {
  id: string;
  field: string;
  replacements: { find: string; replace: string }[];
};

const PT_EDITS: PortableTextEdit[] = [
  {
    id: 'procedure-zespol-ciesni-nadgarstka',
    field: 'aftercare',
    replacements: [
      { find: 'na podstawie tego, że', replace: 'uzasadniając to tym, że' },
    ],
  },
  {
    // Patient guide _id is the bare slug (not -przewodnik-dla-pacjentow);
    // verified via GROQ.
    id: 'article-zespol-ciesni-nadgarstka',
    field: 'body',
    replacements: [
      { find: 'potrzebuje rozprostować palce', replace: 'musi rozprostować palce' },
      // Polish low-9 / high-66 curly quotes: U+201E and U+201D.
      { find: 'z ręki „odrętwiałej”', replace: 'z odrętwiałą ręką' },
      // Straight-quote variant kept as fallback for any future doc that
      // ships with ASCII quotes by mistake.
      { find: 'z ręki "odrętwiałej"', replace: 'z odrętwiałą ręką' },
    ],
  },
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    field: 'body',
    replacements: [
      {
        find: 'wcześniej traktowana jedynie jako skojarzenie',
        replace: 'wcześniej traktowana jedynie jako korelacja',
      },
      { find: '85 wariantami w 56 lokus', replace: '85 wariantami w 56 lokusach' },
    ],
  },
];

// Simple top-level string field edits (no Portable Text traversal needed).
type FieldEdit = {
  id: string;
  field: string;
  before: string;
  after: string;
};

const FIELD_EDITS: FieldEdit[] = [
  {
    id: 'glossary-complex-regional-pain-syndrome',
    field: 'termPolish',
    before: 'zespół wieloobjawowego bólu miejscowego (CRPS)',
    after: 'kompleksowy zespół bólu regionalnego (CRPS)',
  },
];

function patchBlocksRecursive(
  blocks: Block[],
  replacements: { find: string; replace: string }[],
): { blocks: Block[]; hits: number } {
  let hits = 0;
  const out = blocks.map((block) => {
    let newBlock = block;
    if (block._type === 'block' && Array.isArray(block.children)) {
      const newChildren = block.children.map((child) => {
        if (typeof child.text !== 'string') return child;
        let text = child.text;
        for (const { find, replace } of replacements) {
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
      const inner = patchBlocksRecursive(newBlock.content as Block[], replacements);
      hits += inner.hits;
      newBlock = { ...newBlock, content: inner.blocks };
    }
    return newBlock;
  });
  return { blocks: out, hits };
}

async function main() {
  console.log(`audit-fix-pl-stylistic-kalki — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

  // Portable-text edits.
  for (const edit of PT_EDITS) {
    const doc = await client.fetch<{ _id: string; [k: string]: unknown } | null>(
      `*[_id == $id][0]{_id, "value": ${edit.field}}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`  · ${edit.id} — not found, skipping`);
      continue;
    }
    const value = doc.value as Block[] | undefined;
    if (!Array.isArray(value)) {
      console.log(`  · ${edit.id}.${edit.field} — not a portable-text array, skipping`);
      continue;
    }
    const { blocks, hits } = patchBlocksRecursive(value, edit.replacements);
    console.log(`  · ${edit.id}.${edit.field} — ${hits} replacement(s)`);
    if (hits === 0 || !COMMIT) continue;
    await client.patch(edit.id).set({ [edit.field]: blocks }).commit();
    console.log(`    ✓ committed`);
  }

  // Simple field edits.
  for (const edit of FIELD_EDITS) {
    const doc = await client.fetch<{ _id: string; [k: string]: unknown } | null>(
      `*[_id == $id][0]{_id, "value": ${edit.field}}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`  · ${edit.id}.${edit.field} — not found, skipping`);
      continue;
    }
    if (doc.value === edit.after) {
      console.log(`  · ${edit.id}.${edit.field} — already corrected`);
      continue;
    }
    if (doc.value !== edit.before) {
      console.log(
        `  · ${edit.id}.${edit.field} — current value "${doc.value}" doesn't match expected "${edit.before}"; skipping`,
      );
      continue;
    }
    console.log(`  · ${edit.id}.${edit.field} — "${edit.before}" → "${edit.after}"`);
    if (!COMMIT) continue;
    await client.patch(edit.id).set({ [edit.field]: edit.after }).commit();
    console.log(`    ✓ committed`);
  }

  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
