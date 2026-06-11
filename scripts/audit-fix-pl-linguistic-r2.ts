// site/scripts/audit-fix-pl-linguistic-r2.ts
//
// PL linguistic remediation, round 2 (2026-06-11).
// Audit findings: 01-brand-system/audits/tmp/linguistic.md (sections A–C).
// The 2026-05-18 anglicism pass was incomplete; survivors + glossary
// (never in that pass's scope) are patched here, plus genitive/word-order
// errors, wrong common nouns (krawiec, pacynki), and Polish closing-quote
// normalisation in the two Dupuytren articles + glossary-radial-forearm-flap.
//
// Span layouts pre-flighted via GROQ (scripts/.inspect-pl-r2.ts /
// .inspect-quotes.ts). Phrase-spanning corrections are split into per-span
// substring replacements keyed to the verified (block _key, span text).
//
// procedurePage has NO top-level body — clinical bodies are top-level PT
// arrays (indications/anatomy/positioning/patientSummary/…). The recursive
// patcher walks every such array (and procedureStep objects), so the same
// find/replace list applies regardless of which field a phrase lives in.
//
// glossaryTerm: shortDefinitionPolish is a flat string; fullDefinitionPolish
// is portable text. Both surfaces are handled.
//
// Idempotent. Mirrors site/scripts/audit-fix-pl-anglicisms.ts pattern.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-linguistic-r2.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-linguistic-r2.ts --commit  # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
// EDITOR first: the DEVELOPER token in this workspace was rotated down to
// viewer (read-only) per open-item #1, so it can't write. EDITOR has write.
const TOKEN =
  process.env.SANITY_API_EDITOR_TOKEN ||
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing write token (SANITY_API_DEVELOPER_TOKEN / SANITY_API_EDITOR_TOKEN).');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

// retry wrapper — mirrors seed-article.ts withRetry()
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
      console.log(`      ⟳ ${label} transient error (${msg}), retry ${i + 1}/${attempts - 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

const STRAIGHT = String.fromCharCode(34); // straight "
const RDQUO = '”'; // ”

type Block = {
  _type: string;
  _key?: string;
  children?: { text?: string; [k: string]: unknown }[];
  content?: Block[];
  [k: string]: unknown;
};

// `blockKey` (optional): restrict this replacement to children of the block
// with that _key — needed when the same bare phrase appears both as a
// declined target (glossary placeholder span) and as a correct nominative
// headword elsewhere in the same doc.
type Replacement = { find: string; replace: string; expected: number; blockKey?: string };

type PortableTextEdit = {
  id: string;
  // PT array fields to patch (article: ['body']; procedurePage: all clinical sections).
  fields: string[];
  replacements: Replacement[];
};

// ── PROCEDURE clinical PT array fields (procedurePage has no top-level body) ──
const PROC_FIELDS = [
  'indications', 'contraindications', 'anatomy', 'approach', 'aftercare',
  'complications', 'evidence', 'closure', 'positioning', 'patientSummary',
];

const PT_EDITS: PortableTextEdit[] = [
  // ── 1. CTS clinical-review article ──────────────────────────────────────
  {
    id: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny',
    fields: ['body'],
    replacements: [
      // B-1 broken word order + calque (single span kck)
      { find: 'Silne endorsuje CTS-6 przez wytyczne AAOS 2024 odzwierciedla rozpoznanie',
        replace: 'Silne poparcie CTS-6 przez wytyczne AAOS 2024 odzwierciedla uznanie', expected: 1 },
      // B-2 (span kav) — "endorsują CTS-6 jako"
      { find: 'roku endorsują CTS-6 jako', replace: 'roku rekomendują CTS-6 jako', expected: 1 },
      // B-3 (span khv) — also identical wording in glossary-uctr short def
      { find: 'uznają USCTR, ale nie endorsują go nad standardowymi technikami',
        replace: 'uznają USCTR, ale nie zalecają go ponad standardowe techniki', expected: 1 },
      // B-4 klinicznej adopcji (span khh)
      { find: 'badawczego użycia do klinicznej adopcji w wybranych ośrodkach',
        replace: 'badawczego użycia do wdrożenia klinicznego w wybranych ośrodkach', expected: 1 },
      // B-5 bariery adopcji (span kns)
      { find: 'bariery adopcji to kultura sali operacyjnej',
        replace: 'bariery wdrożenia to kultura sali operacyjnej', expected: 1 },
      // B-6 skojarzony (span k8t)
      { find: 'Żaden z wariantów nie jest niezależnie skojarzony z klinicznym zespołem',
        replace: 'Żaden z wariantów nie jest niezależnie powiązany z klinicznym zespołem', expected: 1 },
      // B-7 skojarzona (span kn0)
      { find: 'skojarzona z dializoterapią przekraczającą pięć lat',
        replace: 'związana z dializoterapią przekraczającą pięć lat', expected: 1 },
      // B-8 emerguje (span k8f)
      { find: 'gdzie wariant ten emerguje', replace: 'gdzie wariant ten się wyłania', expected: 1 },
      // B-9 reprodukują (span k6j)
      { find: 'iniekcja glukozy) reprodukują te zmiany',
        replace: 'iniekcja glukozy) odtwarzają te zmiany', expected: 1 },
      // B-10 "pearl" — two instances, both in em-spans; correction keeps word order.
      // ko7: "kliniczny " (span ko4) + em "pearl" (ko5) → "praktyczna " + "wskazówka"
      { find: 'rozpoznawanie; kliniczny ', replace: 'rozpoznawanie; praktyczna ', expected: 1 },
      // em span ko5 (exact text "pearl"). Block-scoped to ko7 so it can't
      // corrupt the "pearls" em-span (k66 in block k68) via substring match.
      { find: 'pearl', replace: 'wskazówka', expected: 1, blockKey: 'ko7' },
      // k68: "...statystycznymi i klinicznymi " (k65) + em "pearls" (k66)
      { find: 'pearls', replace: 'wskazówkami', expected: 1, blockKey: 'k68' },
    ],
  },
  // ── 2. Dupuytren operative article ──────────────────────────────────────
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    fields: ['body'],
    replacements: [
      // B-19 genitive (span s24, glossary-marked text)
      { find: 'szlak WNT', replace: 'szlaku WNT', expected: 1 },
      // B-20 Adopcja + case on WALANT (span s108 + glossary span s109)
      { find: 'polskich ośrodkach publicznych. Adopcja ',
        replace: 'polskich ośrodkach publicznych. Wdrażanie ', expected: 1 },
      { find: 'znieczulenie WALANT', replace: 'znieczulenia WALANT', expected: 1 }, // glossary span s109
      // B-22 quote normalisation (closing „…" → „…”), per verified spans
      { find: 'termin „choroba Dupuytrena' + STRAIGHT, replace: 'termin „choroba Dupuytrena' + RDQUO, expected: 1 },
      { find: 'wariant „korkociągowy' + STRAIGHT, replace: 'wariant „korkociągowy' + RDQUO, expected: 1 },
      { find: 'jako „strefę serpentyny' + STRAIGHT, replace: 'jako „strefę serpentyny' + RDQUO, expected: 1 },
      { find: 'bez ambicji „radykalnej' + STRAIGHT, replace: 'bez ambicji „radykalnej' + RDQUO, expected: 1 },
    ],
  },
  // ── 2b. Dupuytren patient article — quote normalisation only ────────────
  {
    id: 'article-choroba-dupuytrena',
    fields: ['body'],
    replacements: [
      { find: '„Choroba Dupuytrena' + STRAIGHT, replace: '„Choroba Dupuytrena' + RDQUO, expected: 1 },
      { find: '„Przykurcz Dupuytrena' + STRAIGHT, replace: '„Przykurcz Dupuytrena' + RDQUO, expected: 1 },
      { find: '„choroba wikingów' + STRAIGHT, replace: '„choroba wikingów' + RDQUO, expected: 1 },
      { find: '„celtycka ręka' + STRAIGHT, replace: '„celtycka ręka' + RDQUO, expected: 1 },
      { find: '„postać agresywną' + STRAIGHT, replace: '„postać agresywną' + RDQUO, expected: 1 },
      { find: '„diatezę Dupuytrena' + STRAIGHT, replace: '„diatezę Dupuytrena' + RDQUO, expected: 1 },
      { find: '„powikłaniem' + STRAIGHT, replace: '„powikłaniem' + RDQUO, expected: 1 },
    ],
  },
  // ── 3. Free-flap mixed-audience article ─────────────────────────────────
  {
    id: 'article-wolne-platy',
    fields: ['body'],
    replacements: [
      // B-23 wrong anatomical name (span s32)
      { find: 'bez dominującej szypuły (krawiec, sartorius)',
        replace: 'bez dominującej szypuły (mięsień krawiecki, sartorius)', expected: 1 },
      // B-24 internal inconsistency nabrzusznej → nadbrzusznej (span s46)
      { find: 'perforatorze tętnicy nabrzusznej dolnej głębokiej',
        replace: 'perforatorze tętnicy nadbrzusznej dolnej głębokiej', expected: 1 },
    ],
  },
  // ── 4. Limited fasciectomy procedure ────────────────────────────────────
  {
    id: 'procedure-fasciektomia-ograniczona',
    fields: PROC_FIELDS,
    replacements: [
      // B-25 un-declined glossary placeholders, indications b11 (spans s17,s19).
      // Block-scoped to b11: the same bare phrases recur as CORRECT nominative/
      // accusative forms in anatomy b34 (s59 strong headword, s60 prose) — must not touch those.
      { find: 'pasmo spiralne', replace: 'pasma spiralnego', expected: 1, blockKey: 'b11' },
      { find: 'pęczek naczyniowo-nerwowy', replace: 'pęczka naczyniowo-nerwowego', expected: 1, blockKey: 'b11' },
      // B-26 Adopcja, positioning b44 (span s79)
      { find: '. Adopcja w Polsce postępuje stopniowo',
        replace: '. Wdrażanie w Polsce postępuje stopniowo', expected: 1 },
      // B-27 dedykowanym, patientSummary b127 (span s226)
      { find: 'znajdują się w dedykowanym ', replace: 'znajdują się w osobnym ', expected: 1 },
    ],
  },
  // ── 5. Percutaneous needle fasciotomy procedure ─────────────────────────
  {
    id: 'procedure-aponeurotomia-iglowa-przezskorna',
    fields: PROC_FIELDS,
    replacements: [
      // B-30 genitive, anatomy b33 (span s53, glossary text)
      { find: 'rozcięgno dłoniowe', replace: 'rozcięgna dłoniowego', expected: 1 },
      // B-31 wrong word pacynki, anatomy b35 (span s58)
      { find: 'pacynki skórne mogą być silnie pomarszczone',
        replace: 'fałdy skórne mogą być silnie pomarszczone', expected: 1 },
      // B-32 dedykowanym, patientSummary b135 (span s240)
      { find: 'znajdują się w dedykowanym ', replace: 'znajdują się w osobnym ', expected: 1 },
    ],
  },
  // ── 6. Glossary fullDefinitionPolish (portable text) ────────────────────
  {
    id: 'glossary-alt-flap',
    fields: ['fullDefinitionPolish'],
    replacements: [
      { find: 'akceptowalna morbidność czynnościowa',
        replace: 'akceptowalna chorobowość miejsca dawczego', expected: 1 },
    ],
  },
  {
    id: 'glossary-diep-flap',
    fields: ['fullDefinitionPolish'],
    replacements: [
      { find: 'co zmniejsza morbidność miejsca dawczego',
        replace: 'co zmniejsza chorobowość miejsca dawczego', expected: 1 },
    ],
  },
  {
    id: 'glossary-supermicrosurgery',
    fields: ['fullDefinitionPolish'],
    replacements: [
      { find: 'oraz dedykowanych instrumentów ultradelikatnych',
        replace: 'oraz specjalistycznych instrumentów ultradelikatnych', expected: 1 },
    ],
  },
];

// ── Flat string-field edits (shortDefinitionPolish on glossary) ───────────
type StringFieldEdit = { id: string; path: string; replacements: Replacement[] };

const STRING_FIELD_EDITS: StringFieldEdit[] = [
  {
    id: 'glossary-uctr',
    path: 'shortDefinitionPolish',
    replacements: [
      { find: 'uznają UCTR, ale nie endorsują go nad standardowymi technikami',
        replace: 'uznają UCTR, ale nie zalecają go ponad standardowe techniki', expected: 1 },
    ],
  },
  {
    id: 'glossary-wyniki-raportowane-przez-pacjenta',
    path: 'shortDefinitionPolish',
    replacements: [
      { find: '(9-pozycyjna, dedykowana Dupuytrenowi, preferowana przez FESSH)',
        replace: '(9-pozycyjna, przeznaczona dla choroby Dupuytrena, preferowana przez FESSH)', expected: 1 },
    ],
  },
];

// ── glossary-radial-forearm-flap quote normalisation (fullDefinitionPolish PT) ──
PT_EDITS.push({
  id: 'glossary-radial-forearm-flap',
  fields: ['fullDefinitionPolish'],
  replacements: [
    { find: 'historycznie „płat chiński' + STRAIGHT, replace: 'historycznie „płat chiński' + RDQUO, expected: 1 },
  ],
});

function patchBlocksRecursive(
  blocks: Block[],
  replacements: Replacement[],
): { blocks: Block[]; hitsByFind: Map<string, number> } {
  const hitsByFind = new Map<string, number>();
  const out = blocks.map((block) => {
    let newBlock = block;
    if (block._type === 'block' && Array.isArray(block.children)) {
      // Honour blockKey scoping: a replacement with blockKey set only applies
      // inside that block; unscoped replacements apply everywhere.
      const applicable = replacements.filter((r) => !r.blockKey || r.blockKey === block._key);
      const newChildren = block.children.map((child) => {
        if (typeof child.text !== 'string') return child;
        let text = child.text;
        for (const { find, replace } of applicable) {
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
      for (const [k, v] of inner.hitsByFind) hitsByFind.set(k, (hitsByFind.get(k) || 0) + v);
      newBlock = { ...newBlock, content: inner.blocks };
    }
    return newBlock;
  });
  return { blocks: out, hitsByFind };
}

async function main() {
  console.log(`audit-fix-pl-linguistic-r2 — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

  let anyMismatch = false;
  let totalHits = 0;

  for (const edit of PT_EDITS) {
    const projection = edit.fields.map((f) => `"${f}": ${f}`).join(', ');
    const doc = await withRetry(
      () => client.fetch<Record<string, unknown> | null>(`*[_id == $id][0]{${projection}}`, { id: edit.id }),
      `fetch ${edit.id}`,
    );
    if (!doc) {
      console.log(`\n  ✗ ${edit.id} — not found, skipping`);
      anyMismatch = true;
      continue;
    }

    const aggHits = new Map<string, number>();
    const patched: Record<string, Block[]> = {};
    let touched = false;

    for (const field of edit.fields) {
      const value = doc[field] as Block[] | undefined;
      if (!Array.isArray(value)) continue; // field absent on this doc — fine
      const { blocks, hitsByFind } = patchBlocksRecursive(value, edit.replacements);
      for (const [k, v] of hitsByFind) aggHits.set(k, (aggHits.get(k) || 0) + v);
      patched[field] = blocks;
      if ([...hitsByFind.values()].some((n) => n > 0)) touched = true;
    }

    const docTotal = [...aggHits.values()].reduce((a, b) => a + b, 0);
    console.log(`\n  · ${edit.id} (${edit.fields.join('/')}) — ${docTotal} replacement(s)`);
    for (const r of edit.replacements) {
      const hits = aggHits.get(r.find) || 0;
      const status = hits === r.expected ? '✓' : '✗';
      const note = hits === r.expected ? '' : ` (expected ${r.expected})`;
      console.log(`      ${status} ${hits}×${note}  "${r.find.slice(0, 56)}${r.find.length > 56 ? '…' : ''}"`);
      if (hits !== r.expected) anyMismatch = true;
    }
    totalHits += docTotal;

    if (!touched || !COMMIT) continue;
    const setObj: Record<string, unknown> = {};
    for (const field of Object.keys(patched)) setObj[field] = patched[field];
    await withRetry(() => client.patch(edit.id).set(setObj).commit(), `patch ${edit.id}`);
    console.log(`      ✓ committed`);
  }

  for (const edit of STRING_FIELD_EDITS) {
    const doc = await withRetry(
      () => client.fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id: edit.id }),
      `fetch ${edit.id}`,
    );
    if (!doc) {
      console.log(`\n  ✗ ${edit.id} — not found, skipping`);
      anyMismatch = true;
      continue;
    }
    const segments = edit.path.split('.');
    let current: unknown = doc;
    for (const seg of segments) {
      current = current && typeof current === 'object' ? (current as Record<string, unknown>)[seg] : undefined;
    }
    if (typeof current !== 'string') {
      console.log(`\n  ✗ ${edit.id}.${edit.path} — not a string field, skipping`);
      anyMismatch = true;
      continue;
    }
    let updated = current;
    const localHits = new Map<string, number>();
    for (const r of edit.replacements) {
      const hits = updated.includes(r.find) ? updated.split(r.find).length - 1 : 0;
      localHits.set(r.find, hits);
      if (hits > 0) updated = updated.split(r.find).join(r.replace);
    }
    const docTotal = [...localHits.values()].reduce((a, b) => a + b, 0);
    console.log(`\n  · ${edit.id}.${edit.path} — ${docTotal} replacement(s)`);
    for (const r of edit.replacements) {
      const hits = localHits.get(r.find) || 0;
      const status = hits === r.expected ? '✓' : '✗';
      const note = hits === r.expected ? '' : ` (expected ${r.expected})`;
      console.log(`      ${status} ${hits}×${note}  "${r.find.slice(0, 56)}${r.find.length > 56 ? '…' : ''}"`);
      if (hits !== r.expected) anyMismatch = true;
    }
    totalHits += docTotal;
    if (docTotal === 0 || !COMMIT) continue;
    await withRetry(() => client.patch(edit.id).set({ [edit.path]: updated }).commit(), `patch ${edit.id}`);
    console.log(`      ✓ committed`);
  }

  const expectedTotal =
    PT_EDITS.flatMap((e) => e.replacements).reduce((a, r) => a + r.expected, 0) +
    STRING_FIELD_EDITS.flatMap((e) => e.replacements).reduce((a, r) => a + r.expected, 0);
  console.log(`\n  Total: ${totalHits} replacements (expected ${expectedTotal})`);

  if (anyMismatch) {
    console.error('\n✗ Hit count mismatch — review find strings before committing.');
    process.exit(2);
  }
  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
