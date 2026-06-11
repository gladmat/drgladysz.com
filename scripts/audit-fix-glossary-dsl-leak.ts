// site/scripts/audit-fix-glossary-dsl-leak.ts
//
// Seed-pipeline bug fix (2026-06-11). Three blocks across two procedure docs
// stored literal `[gloss:slug|displayed]` DSL in span text instead of having
// it expanded into Portable Text glossaryTerm marks during seeding — so
// readers saw raw markup. Found via scripts/.investigate-dsl-leak.ts.
//
// Target state mirrors the correctly-rendered parallel block
// procedure-fasciektomia-ograniczona indications b11: plain connective text +
// glossary-marked terms carrying the declined Polish display text. NOTE the
// renderer (PortableTextSpan.astro) DROPS decorators on glossary spans, so the
// leaked `*`/strong emphasis cannot coexist with a glossary mark; b11 is fully
// plain, and these fixes match it (no em, no literal asterisks).
//
// Leaks fixed:
//   1. procedure-aponeurotomia-iglowa-przezskorna  contraindications b24
//      → "kliniczne podejrzenie [pasma spiralnego] z prawdopodobnym
//         przemieszczeniem [pęczka naczyniowo-nerwowego] — …"
//        (drops the garbled Latin/English DSL display + stray asterisks)
//   2. procedure-aponeurotomia-iglowa-przezskorna  complications   b115
//   3. procedure-fasciektomia-ograniczona          complications   b109
//      → "[kompleksowy zespół bólu regionalnego (CRPS)] — …"
//
// Idempotent: each block is only patched if its current children still contain
// the literal "[gloss:" marker. Re-run after commit reports 0 leaks.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-glossary-dsl-leak.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-glossary-dsl-leak.ts --commit  # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN =
  process.env.SANITY_API_EDITOR_TOKEN ||
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing write token (SANITY_API_EDITOR_TOKEN).');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /ECONNRESET|ETIMEDOUT|socket hang up|timeout|429|50[234]/i.test(msg);
      if (!transient || i === attempts - 1) break;
      const delay = 500 * 2 ** i;
      console.log(`      ⟳ ${label} retry ${i + 1} in ${delay}ms (${msg})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
type MarkDef = { _type: string; _key: string; term?: { _ref: string; _type: 'reference' } };

const gloss = (key: string, ref: string): MarkDef => ({
  _type: 'glossaryTerm',
  _key: key,
  term: { _ref: ref, _type: 'reference' },
});
const span = (key: string, text: string, marks: string[] = []): Span => ({
  _type: 'span',
  _key: key,
  text,
  marks,
});

// Each fix names the field, block _key, and the rebuilt children + markDefs.
const FIXES = [
  {
    id: 'procedure-aponeurotomia-iglowa-przezskorna',
    field: 'contraindications',
    blockKey: 'b24',
    markDefs: [
      gloss('gSpiral', 'glossary-spiral-cord'),
      gloss('gNvb', 'glossary-digital-neurovascular-bundle'),
    ],
    children: [
      span('s34a', 'kliniczne podejrzenie '),
      span('s34b', 'pasma spiralnego', ['gSpiral']),
      span('s34c', ' z prawdopodobnym przemieszczeniem '),
      span('s34d', 'pęczka naczyniowo-nerwowego', ['gNvb']),
      span(
        's34e',
        ' — najistotniejsze przeciwwskazanie kliniczne; ślepa dyssekcja w strefie domniemanego przemieszczenia naczyniowo-nerwowego stanowi nieproporcjonalne ryzyko jatrogennego uszkodzenia nerwu palcowego,',
      ),
    ],
  },
  {
    id: 'procedure-aponeurotomia-iglowa-przezskorna',
    field: 'complications',
    blockKey: 'b115',
    markDefs: [gloss('gCrps', 'glossary-complex-regional-pain-syndrome')],
    children: [
      span('s201', 'kompleksowy zespół bólu regionalnego (CRPS)', ['gCrps']),
      span('s202', ' — sporadyczny, znacząco rzadszy niż po fasciektomii ograniczonej,'),
    ],
  },
  {
    id: 'procedure-fasciektomia-ograniczona',
    field: 'complications',
    blockKey: 'b109',
    markDefs: [gloss('gCrps', 'glossary-complex-regional-pain-syndrome')],
    children: [
      span('s180', 'kompleksowy zespół bólu regionalnego (CRPS)', ['gCrps']),
      span(
        's181',
        ' — 3–5% w obserwacji 6-miesięcznej; wczesne rozpoznanie i intensywna rehabilitacja są kluczowe,',
      ),
    ],
  },
] as const;

let patched = 0;
let skipped = 0;

for (const fix of FIXES) {
  const doc = await withRetry(() => client.getDocument(fix.id), `get ${fix.id}`);
  const arr: any[] = (doc as any)?.[fix.field] ?? [];
  const block = arr.find((b) => b?._key === fix.blockKey);
  console.log(`\n· ${fix.id} ${fix.field}[${fix.blockKey}]`);
  if (!block) {
    console.log('    ✗ block not found — SKIP');
    skipped++;
    continue;
  }
  const hasLeak = (block.children ?? []).some(
    (s: any) => typeof s.text === 'string' && s.text.includes('[gloss:'),
  );
  if (!hasLeak) {
    console.log('    ✓ no [gloss: leak present — already fixed, SKIP');
    skipped++;
    continue;
  }

  console.log('    BEFORE:');
  for (const s of block.children) console.log(`      ${s._key} [${(s.marks || []).join(',')}] "${s.text}"`);
  console.log('    AFTER:');
  for (const s of fix.children) console.log(`      ${s._key} [${s.marks.join(',')}] "${s.text}"`);

  if (COMMIT) {
    await withRetry(
      () =>
        client
          .patch(fix.id)
          .set({
            [`${fix.field}[_key=="${fix.blockKey}"].children`]: fix.children,
            [`${fix.field}[_key=="${fix.blockKey}"].markDefs`]: fix.markDefs,
          })
          .commit(),
      `patch ${fix.id}/${fix.blockKey}`,
    );
    console.log('    ✔ committed');
  }
  patched++;
}

console.log(
  `\n${COMMIT ? 'COMMITTED' : 'DRY-RUN'} — ${patched} block(s) ${COMMIT ? 'patched' : 'to patch'}, ${skipped} skipped.`,
);
if (!COMMIT && patched > 0) console.log('Re-run with --commit to apply.');
