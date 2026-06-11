// site/scripts/audit-fix-pl-anglicisms.ts
//
// Audit fix (2026-05-18): linguistic cleanup of PL knowledge-base articles.
// User (native Polish speaker) flagged "morbidność miejsca dawczego" while
// re-reading /pl/blog/wolne-platy — kalka from EN "donor-site morbidity".
// Audit of the 5 PL articles surfaced 25 anglicisms / kalki / typos across
// 3 docs (CTS-patient + Dupuytren-patient bodies came back clean).
//
// Replacements (all are within single Portable Text spans — pre-flight GROQ
// confirmed expected hit counts match: framework 3×, endorsowan 3×,
// skojarzeni 3×, adresowania 2× CTS, zaadresowania 2× Dup, morbidność 2× WP):
//
// article-wolne-platy.body (3):
//   "akceptowalną morbidność miejsca dawczego" → "akceptowalne powikłania ..."
//   "zmniejszając morbidność miejsca dawczego" → "zmniejszając powikłania ..."
//   "trymowaniu wyspy skórnej"                 → "przycięciu wyspy skórnej"
//
// article-zespol-ciesni-nadgarstka-przeglad-kliniczny.body (16):
//   framework × 3, endorsowan/y/ą/ym × 3, skojarzeni × 3, adresowania × 2,
//   adoptowane × 1, nieprzezhwytany × 1, "dedykowany artykuł" × 1,
//   "akceptowalnego podejścia" × 1, "preferowana w aktualnych" × 1
//
// article-choroba-dupuytrena-leczenie-operacyjne.body (6):
//   zaadresowania × 2, "Komponenta dziedziczna", "9 lokus ryzyka",
//   "dedykowanym chorobie", "preferowanym w środowisku"
//
// Idempotent. Mirrors site/scripts/audit-fix-pl-stylistic-kalki.ts pattern.
//
// Usage:
//   cd site && source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-anglicisms.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-anglicisms.ts --commit  # apply

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

type Replacement = { find: string; replace: string; expected: number };

type PortableTextEdit = {
  id: string;
  field: string;
  replacements: Replacement[];
};

const PT_EDITS: PortableTextEdit[] = [
  {
    id: 'article-wolne-platy',
    field: 'body',
    replacements: [
      { find: 'akceptowalną morbidność miejsca dawczego', replace: 'akceptowalne powikłania miejsca dawczego', expected: 1 },
      { find: 'zmniejszając morbidność miejsca dawczego', replace: 'zmniejszając powikłania miejsca dawczego', expected: 1 },
      { find: 'trymowaniu wyspy skórnej', replace: 'przycięciu wyspy skórnej', expected: 1 },
    ],
  },
  {
    id: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny',
    field: 'body',
    replacements: [
      // framework × 3 in body — each in distinct surrounding context.
      // (4th framework "sformułować framework „równoważności z kompromisami”"
      // lives in keyPoints.meaning — patched via STRING_FIELD_EDITS below.)
      { find: "ogranicza się do framework'u dowodów porównawczych", replace: 'ogranicza się do ram dowodów porównawczych', expected: 1 },
      { find: 'Framework Mackinnon i Pripotneva z 2022 roku', replace: 'Schemat Mackinnon i Pripotneva z 2022 roku', expected: 1 },
      { find: 'Framework Pripotneva i Mackinnon', replace: 'Schemat Pripotneva i Mackinnon', expected: 1 },
      // skojarzeni × 3 — different forms
      { find: 'tego skojarzenia w literaturze popularnej', replace: 'tego powiązania w literaturze popularnej', expected: 1 },
      { find: 'Skwantyfikowane skojarzenia z aktualnych metaanaliz', replace: 'Skwantyfikowane powiązania z aktualnych metaanaliz', expected: 1 },
      { find: 'brak ustalonego skojarzenia między', replace: 'brak ustalonego powiązania między', expected: 1 },
      // endorsowan × 3 — three distinct case forms
      { find: 'konsensus, endorsowany przez AAOS', replace: 'konsensus, popierany przez AAOS', expected: 1 },
      { find: 'pozycją endorsowaną przez AAOS', replace: 'pozycją popieraną przez AAOS', expected: 1 },
      { find: 'endorsowanym przez AAOS wyborem', replace: 'rekomendowanym przez AAOS wyborem', expected: 1 },
      // adresowania × 2 — same pattern, two locations
      { find: 'adresowania zdiagnozowanej przyczyny', replace: 'wyeliminowania zdiagnozowanej przyczyny', expected: 2 },
      // singletons
      { find: 'zostało adoptowane na znaczną skalę', replace: 'zostało przyjęte na znaczną skalę', expected: 1 },
      { find: 'znieczulenia miejscowego jako akceptowalnego podejścia', replace: 'znieczulenia miejscowego jako dopuszczalnego podejścia', expected: 1 },
      { find: 'nieprzezhwytany uraz wariantu Lanza', replace: 'nierozpoznany uraz wariantu Lanza', expected: 1 },
      { find: 'osobny dedykowany artykuł', replace: 'osobny artykuł', expected: 1 },
      { find: 'jest coraz częściej preferowana w aktualnych badaniach', replace: 'jest coraz częściej wybierana w aktualnych badaniach', expected: 1 },
    ],
  },
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    field: 'body',
    replacements: [
      { find: 'lukę publikacyjną wartą zaadresowania', replace: 'lukę publikacyjną wartą wypełnienia', expected: 1 },
      { find: 'Komponenta dziedziczna jest dominująca', replace: 'Składowa dziedziczna jest dominująca', expected: 1 },
      { find: 'początkowo Dolmansa z 9 lokus ryzyka', replace: 'początkowo Dolmansa z 9 lokusów ryzyka', expected: 1 },
      { find: '9-pozycyjnym narzędziem dedykowanym chorobie Dupuytrena', replace: '9-pozycyjnym narzędziem stworzonym dla choroby Dupuytrena', expected: 1 },
      { find: 'walidowanym dla obu modalności i preferowanym w środowisku', replace: 'walidowanym dla obu modalności i rekomendowanym w środowisku', expected: 1 },
      { find: 'lukami publikacyjnymi wartymi zaadresowania w nadchodzących latach', replace: 'lukami publikacyjnymi wartymi wypełnienia w nadchodzących latach', expected: 1 },
    ],
  },
];

// Nested string-field edits — substring replace on a dot-path field
// (e.g., keyPoints.meaning). Sanity supports dot-path .set(), but we
// fetch-then-set so we can do substring replacement and verify hit counts.
type StringFieldEdit = {
  id: string;
  path: string; // e.g. "keyPoints.meaning"
  replacements: Replacement[];
};

const STRING_FIELD_EDITS: StringFieldEdit[] = [
  {
    id: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny',
    path: 'keyPoints.meaning',
    replacements: [
      { find: 'sformułować framework „równoważności z kompromisami”', replace: 'sformułować zasadę „równoważności z kompromisami”', expected: 1 },
    ],
  },
];

function patchBlocksRecursive(
  blocks: Block[],
  replacements: Replacement[],
): { blocks: Block[]; hitsByFind: Map<string, number> } {
  const hitsByFind = new Map<string, number>();
  const out = blocks.map((block) => {
    let newBlock = block;
    if (block._type === 'block' && Array.isArray(block.children)) {
      const newChildren = block.children.map((child) => {
        if (typeof child.text !== 'string') return child;
        let text = child.text;
        for (const { find, replace } of replacements) {
          if (text.includes(find)) {
            const hits = text.split(find).length - 1;
            hitsByFind.set(find, (hitsByFind.get(find) || 0) + hits);
            text = text.split(find).join(replace);
          }
        }
        return text === child.text ? child : { ...child, text };
      });
      newBlock = { ...block, children: newChildren };
    }
    if (Array.isArray(newBlock.content)) {
      const inner = patchBlocksRecursive(newBlock.content as Block[], replacements);
      for (const [k, v] of inner.hitsByFind) {
        hitsByFind.set(k, (hitsByFind.get(k) || 0) + v);
      }
      newBlock = { ...newBlock, content: inner.blocks };
    }
    return newBlock;
  });
  return { blocks: out, hitsByFind };
}

async function main() {
  console.log(`audit-fix-pl-anglicisms — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

  let anyMismatch = false;
  let totalHits = 0;

  for (const edit of PT_EDITS) {
    const doc = await client.fetch<{ _id: string; [k: string]: unknown } | null>(
      `*[_id == $id][0]{_id, "value": ${edit.field}}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`\n  ✗ ${edit.id} — not found, skipping`);
      anyMismatch = true;
      continue;
    }
    const value = doc.value as Block[] | undefined;
    if (!Array.isArray(value)) {
      console.log(`\n  ✗ ${edit.id}.${edit.field} — not a portable-text array, skipping`);
      anyMismatch = true;
      continue;
    }

    const { blocks, hitsByFind } = patchBlocksRecursive(value, edit.replacements);
    const docTotal = [...hitsByFind.values()].reduce((a, b) => a + b, 0);
    console.log(`\n  · ${edit.id}.${edit.field} — ${docTotal} replacement(s) total`);
    for (const r of edit.replacements) {
      const hits = hitsByFind.get(r.find) || 0;
      const status = hits === r.expected ? '✓' : '✗';
      const expectedNote = hits === r.expected ? '' : ` (expected ${r.expected})`;
      console.log(`      ${status} ${hits}×${expectedNote}  "${r.find.slice(0, 60)}${r.find.length > 60 ? '…' : ''}"`);
      if (hits !== r.expected) anyMismatch = true;
    }
    totalHits += docTotal;

    if (docTotal === 0 || !COMMIT) continue;
    await client.patch(edit.id).set({ [edit.field]: blocks }).commit();
    console.log(`      ✓ committed`);
  }

  // String-field edits (e.g., keyPoints.meaning).
  for (const edit of STRING_FIELD_EDITS) {
    const doc = await client.fetch<Record<string, unknown> | null>(
      `*[_id == $id][0]`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`\n  ✗ ${edit.id} — not found, skipping`);
      anyMismatch = true;
      continue;
    }
    // Walk the dot-path to read the current value.
    const segments = edit.path.split('.');
    let current: unknown = doc;
    for (const seg of segments) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[seg];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current !== 'string') {
      console.log(`\n  ✗ ${edit.id}.${edit.path} — not a string field, skipping`);
      anyMismatch = true;
      continue;
    }
    let updated = current;
    const localHits = new Map<string, number>();
    for (const r of edit.replacements) {
      if (updated.includes(r.find)) {
        const hits = updated.split(r.find).length - 1;
        localHits.set(r.find, hits);
        updated = updated.split(r.find).join(r.replace);
      } else {
        localHits.set(r.find, 0);
      }
    }
    const docTotal = [...localHits.values()].reduce((a, b) => a + b, 0);
    console.log(`\n  · ${edit.id}.${edit.path} — ${docTotal} replacement(s) total`);
    for (const r of edit.replacements) {
      const hits = localHits.get(r.find) || 0;
      const status = hits === r.expected ? '✓' : '✗';
      const note = hits === r.expected ? '' : ` (expected ${r.expected})`;
      console.log(`      ${status} ${hits}×${note}  "${r.find.slice(0, 60)}${r.find.length > 60 ? '…' : ''}"`);
      if (hits !== r.expected) anyMismatch = true;
    }
    totalHits += docTotal;
    if (docTotal === 0 || !COMMIT) continue;
    // Sanity supports dot-path .set() — use it to patch nested string.
    await client.patch(edit.id).set({ [edit.path]: updated }).commit();
    console.log(`      ✓ committed`);
  }

  const expectedTotal = PT_EDITS.flatMap(e => e.replacements).reduce((a, r) => a + r.expected, 0)
    + STRING_FIELD_EDITS.flatMap(e => e.replacements).reduce((a, r) => a + r.expected, 0);
  console.log(`\n  Total: ${totalHits} replacements (expected ${expectedTotal})`);

  if (anyMismatch) {
    console.error('\n✗ Hit count mismatch — review and adjust find strings before committing.');
    process.exit(2);
  }
  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
