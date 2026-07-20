// site/scripts/audit-fix-pl-2026-07-linguistic.ts
//
// PL linguistic remediation, 2026-07 full-corpus pass.
// Sources: five native-PL editorial audits over the complete PL export
// (all 5 articles + 3 procedures + 92 bilingual glossary terms).
// Only clear errors are patched: anglicisms/calques, inflection (case,
// participle-subject agreement, numeral government), orthography of
// Latin/Greek terms, and four raw-Markdown DSL leaks (** / *) that reached
// live span text on the CTS procedure.
//
// Surgical: each replacement is an exact substring of a single span, scoped
// by block _key where the find string is short or recurs. Marks (citation /
// glossary) are preserved — only child.text changes. Mirrors the
// audit-fix-pl-linguistic-r2.ts structure. Idempotent; expected-count guard.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-2026-07-linguistic.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-2026-07-linguistic.ts --commit  # apply

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
    try { return await fn(); } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /ECONNRESET|ETIMEDOUT|socket hang up|timeout|429|50[234]/i.test(msg);
      if (!transient || i === attempts - 1) break;
      const delay = 500 * 2 ** i;
      console.log(`      ⟳ ${label} retry ${i + 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

type Block = {
  _type: string; _key?: string;
  children?: { text?: string; [k: string]: unknown }[];
  content?: Block[]; [k: string]: unknown;
};
type Replacement = { find: string; replace: string; expected: number; blockKey?: string };
type PortableTextEdit = { id: string; fields: string[]; replacements: Replacement[] };

// Composite key so two replacements that share an identical find string but
// differ by blockKey (e.g. the bare "**" leak in k3g vs k3u) are counted
// separately instead of colliding on the find string.
const keyOf = (r: Replacement) => `${r.blockKey ?? ''}␟${r.find}␟${r.replace}`;

// procedurePage clinical PT arrays (no top-level body)
const PROC_FIELDS = [
  'summary', 'indications', 'contraindications', 'anatomy', 'positioning',
  'approach', 'closure', 'aftercare', 'complications', 'evidence', 'patientSummary',
];

const PT_EDITS: PortableTextEdit[] = [
  // ── CTS clinical-review article ──────────────────────────────────────────
  {
    id: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny',
    fields: ['body'],
    replacements: [
      { find: 'oraz identyfikowalnym zmianom przestrzennym znalezionym w czasie operacji',
        replace: 'oraz identyfikowalnymi zmianami przestrzennymi stwierdzonymi w czasie operacji', expected: 1 },
      { find: 'mimo utrzymującego się tego powiązania w literaturze popularnej',
        replace: 'mimo utrzymywania się tego powiązania w literaturze popularnej', expected: 1, blockKey: 'k59' },
      { find: 'na podstawie tego, że pacjenci bez powikłań',
        replace: 'z uwagi na to, że pacjenci bez powikłań', expected: 1 },
      { find: 'w ustawianiu realistycznych oczekiwań',
        replace: 'w kształtowaniu realistycznych oczekiwań', expected: 1 },
      { find: 'identyfikacji mniejszości pacjentów rozwijających ból w okolicy kłębów lub sztywność',
        replace: 'identyfikacji mniejszości pacjentów, u których rozwija się ból w okolicy kłębów lub sztywność', expected: 1 },
      { find: 'w porównaniu do otwartego i endoskopowego',
        replace: 'w porównaniu z otwartym i endoskopowym', expected: 1 },
      { find: 'wyprowadzona przez teorię odpowiedzi pozycji z BCTQ-SSS',
        replace: 'wyprowadzona metodą teorii odpowiedzi na pozycję z BCTQ-SSS', expected: 1 },
      { find: 'i krótszy czas administracji', replace: 'i krótszy czas przeprowadzenia', expected: 1 },
      { find: 'Czasowanie powrotu do pracy zostało scharakteryzowane',
        replace: 'Moment powrotu do pracy został scharakteryzowany', expected: 1 },
      { find: 'kształtuje się między 2:1 a 3:1, zwężając się od historycznego 10:1 do współczesnych 2:1–3:1 w ostatnich dekadach',
        replace: 'zwęził się w ostatnich dekadach z historycznego 10:1 do współczesnych 2:1–3:1', expected: 1 },
      { find: 'choroba kontralateralna rozwijająca się po operacji indeksowej',
        replace: 'choroba po stronie przeciwnej rozwijająca się po operacji indeksowej', expected: 1 },
    ],
  },
  // ── CTS procedure — DSL leaks + calques/grammar ──────────────────────────
  {
    id: 'procedure-zespol-ciesni-nadgarstka',
    fields: PROC_FIELDS,
    replacements: [
      // raw Markdown ** / * that leaked to live span text (verified via GROQ)
      { find: 'W przebiegu **', replace: 'W przebiegu ', expected: 1, blockKey: 'k2f' },
      { find: '** lub czynnego zaostrzenia', replace: ' lub czynnego zaostrzenia', expected: 1, blockKey: 'k2f' },
      { find: '**', replace: '', expected: 2, blockKey: 'k3g' },
      { find: '**', replace: '', expected: 2, blockKey: 'k3u' },
      { find: '*', replace: '', expected: 2, blockKey: 'k71' },
      // calque / grammar
      { find: 'jako umiarkowanie negatywne uzasadniając to tym',
        replace: 'jako umiarkowanie negatywne, uzasadniając to tym', expected: 1, blockKey: 'k5n' },
      { find: 'identyfikacji mniejszości pacjentów rozwijających ból w okolicy kłębów',
        replace: 'identyfikacji mniejszości pacjentów, u których rozwija się ból w okolicy kłębów', expected: 1, blockKey: 'k5n' },
      { find: 'Uniesienie kończyny w komfortowych pozycjach',
        replace: 'Uniesienie kończyny w wygodnych pozycjach', expected: 1 },
    ],
  },
  // ── Dupuytren patient article ────────────────────────────────────────────
  {
    id: 'article-choroba-dupuytrena',
    fields: ['body'],
    replacements: [
      { find: 'biegnącego po bokach palca', replace: 'biegnący po bokach palca', expected: 1 },
    ],
  },
  // ── Dupuytren operative article ──────────────────────────────────────────
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    fields: ['body'],
    replacements: [
      { find: 'aktywność gelatynazy A (MMP-2) w aktywnej remodelacji macierzy pozakomórkowej',
        replace: 'aktywność żelatynazy A (MMP-2) w aktywnej przebudowie macierzy pozakomórkowej', expected: 1 },
      { find: 'z 9 lokusów ryzyka (sześć w obrębie', replace: 'z 9 lokusami ryzyka (sześć w obrębie', expected: 1 },
      { find: 'dermofasciektomia', replace: 'dermofasciektomii', expected: 1 },
      { find: 'napędu różnicowania myofibroblastycznego',
        replace: 'czynnika napędzającego różnicowanie miofibroblastyczne', expected: 1 },
      { find: 'średnio o 4,6 jednostek względem placebo', replace: 'średnio o 4,6 jednostki względem placebo', expected: 1 },
      { find: 'z bazowych 23% do 71%', replace: 'z wyjściowych 23% do 71%', expected: 1 },
      { find: 'z 23% bazowych do 71%', replace: 'z 23% wyjściowych do 71%', expected: 1 },
      { find: 'odpowiadającymi fascjektomii ręki', replace: 'odpowiadającymi fasciektomii ręki', expected: 1 },
      { find: 'pozostaje w pewnym napięciu z oryginalną hipotezą Huestona',
        replace: 'pozostaje w pewnej sprzeczności z pierwotną hipotezą Huestona', expected: 1 },
    ],
  },
  // ── Free-flap mixed-audience article ─────────────────────────────────────
  {
    id: 'article-wolne-platy',
    fields: ['body'],
    replacements: [
      { find: 'zabarwienie, ucieplenie, wypełnianie kapilarne, sygnał Dopplera',
        replace: 'zabarwienie, ocieplenie, wypełnianie kapilarne, sygnał Dopplera', expected: 1 },
      { find: 'choroby autoimmunologiczne pod leczeniem immunosupresyjnym',
        replace: 'choroby autoimmunologiczne w trakcie leczenia immunosupresyjnego', expected: 1 },
      { find: 'przeszczep tkanek złożonych unaczynniony',
        replace: 'unaczyniony przeszczep tkanek złożonych', expected: 1 },
      { find: 'Wolny przeszczep węzłów chłonnych unaczynniony',
        replace: 'Wolny unaczyniony przeszczep węzłów chłonnych', expected: 1 },
    ],
  },
  // ── Limited fasciectomy procedure ────────────────────────────────────────
  {
    id: 'procedure-fasciektomia-ograniczona',
    fields: PROC_FIELDS,
    replacements: [
      { find: 'rozcięgno dłoniowe', replace: 'Rozcięgno dłoniowe', expected: 1, blockKey: 'b28' },
      { find: "w klasyfikacji McFarlane'a 1974", replace: "w klasyfikacji McFarlane'a z 1974 r.", expected: 1 },
      { find: "Klasyfikacja patologicznych pasm McFarlane'a 1974",
        replace: "Klasyfikacja patologicznych pasm McFarlane'a z 1974 r.", expected: 1 },
      { find: 'W zakresie zwolnienia stawu PIP', replace: 'W zakresie uwolnienia stawu PIP', expected: 1 },
      { find: 'rutynowe zwolnienie torebki stawowej nie poprawia',
        replace: 'rutynowe uwolnienie torebki stawowej nie poprawia', expected: 1 },
      { find: 'przewagę nad samym zwolnieniem śródoperacyjnym',
        replace: 'przewagę nad samym uwolnieniem śródoperacyjnym', expected: 1 },
      { find: 'wymagającego rozległego zwolnienia stawowego',
        replace: 'wymagającego rozległego uwolnienia stawowego', expected: 1 },
    ],
  },
  // ── Percutaneous needle fasciotomy procedure ─────────────────────────────
  {
    id: 'procedure-aponeurotomia-iglowa-przezskorna',
    fields: PROC_FIELDS,
    replacements: [
      { find: 'za uznane narzędzie pierwszego wyboru', replace: 'za metodę pierwszego wyboru', expected: 1 },
    ],
  },
  // ── Glossary fullDefinitionPolish (PT) ───────────────────────────────────
  {
    id: 'glossary-scip-flap',
    fields: ['fullDefinitionPolish'],
    replacements: [
      { find: '(Daniel- Taylor 1973)', replace: '(Daniel–Taylor 1973)', expected: 1 },
    ],
  },
];

type StringFieldEdit = { id: string; path: string; replacements: Replacement[] };
const STRING_FIELD_EDITS: StringFieldEdit[] = [
  {
    id: 'article-wolne-platy', path: 'keyPoints.findings',
    replacements: [
      { find: 'raportują przeżywalność płatów 95-99%', replace: 'wykazują przeżywalność płatów 95-99%', expected: 1 },
    ],
  },
  {
    id: 'glossary-vca', path: 'termPolish',
    replacements: [
      { find: 'przeszczep tkanek złożonych unaczynniony (VCA)', replace: 'unaczyniony przeszczep tkanek złożonych (VCA)', expected: 1 },
    ],
  },
  {
    id: 'glossary-vlnt', path: 'termPolish',
    replacements: [
      { find: 'przeszczep węzłów chłonnych unaczynniony (VLNT)', replace: 'unaczyniony przeszczep węzłów chłonnych (VLNT)', expected: 1 },
    ],
  },
];

function patchBlocksRecursive(blocks: Block[], replacements: Replacement[]): { blocks: Block[]; hitsByFind: Map<string, number> } {
  const hitsByFind = new Map<string, number>();
  const out = blocks.map((block) => {
    let newBlock = block;
    if (block._type === 'block' && Array.isArray(block.children)) {
      const applicable = replacements.filter((r) => !r.blockKey || r.blockKey === block._key);
      const newChildren = block.children.map((child) => {
        if (typeof child.text !== 'string') return child;
        let text = child.text;
        for (const r of applicable) {
          const { find, replace } = r;
          if (text.includes(find)) {
            const hits = text.split(find).length - 1;
            hitsByFind.set(keyOf(r), (hitsByFind.get(keyOf(r)) || 0) + hits);
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
  console.log(`audit-fix-pl-2026-07-linguistic — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  let anyMismatch = false;
  let totalHits = 0;

  for (const edit of PT_EDITS) {
    const projection = edit.fields.map((f) => `"${f}": ${f}`).join(', ');
    const doc = await withRetry(
      () => client.fetch<Record<string, unknown> | null>(`*[_id == $id][0]{${projection}}`, { id: edit.id }),
      `fetch ${edit.id}`);
    if (!doc) { console.log(`\n  ✗ ${edit.id} — not found`); anyMismatch = true; continue; }

    const aggHits = new Map<string, number>();
    const patched: Record<string, Block[]> = {};
    let touched = false;
    for (const field of edit.fields) {
      const value = doc[field] as Block[] | undefined;
      if (!Array.isArray(value)) continue;
      const { blocks, hitsByFind } = patchBlocksRecursive(value, edit.replacements);
      for (const [k, v] of hitsByFind) aggHits.set(k, (aggHits.get(k) || 0) + v);
      patched[field] = blocks;
      if ([...hitsByFind.values()].some((n) => n > 0)) touched = true;
    }
    const docTotal = [...aggHits.values()].reduce((a, b) => a + b, 0);
    console.log(`\n  · ${edit.id} — ${docTotal} replacement(s)`);
    for (const r of edit.replacements) {
      const hits = aggHits.get(keyOf(r)) || 0;
      const status = hits === r.expected ? '✓' : '✗';
      console.log(`      ${status} ${hits}× (exp ${r.expected})  "${r.find.slice(0, 52)}${r.find.length > 52 ? '…' : ''}"`);
      if (hits !== r.expected) anyMismatch = true;
    }
    totalHits += docTotal;
    if (!touched || !COMMIT) continue;
    await withRetry(() => client.patch(edit.id).set(patched).commit(), `patch ${edit.id}`);
    console.log(`      ✓ committed`);
  }

  for (const edit of STRING_FIELD_EDITS) {
    const doc = await withRetry(() => client.fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id: edit.id }), `fetch ${edit.id}`);
    if (!doc) { console.log(`\n  ✗ ${edit.id} — not found`); anyMismatch = true; continue; }
    let current: unknown = doc;
    for (const seg of edit.path.split('.')) current = current && typeof current === 'object' ? (current as Record<string, unknown>)[seg] : undefined;
    if (typeof current !== 'string') { console.log(`\n  ✗ ${edit.id}.${edit.path} — not a string`); anyMismatch = true; continue; }
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
      console.log(`      ${status} ${hits}× (exp ${r.expected})  "${r.find.slice(0, 52)}${r.find.length > 52 ? '…' : ''}"`);
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
  console.log(`\n  Total: ${totalHits} (expected ${expectedTotal})`);
  if (anyMismatch) { console.error('\n✗ Hit-count mismatch — review find strings.'); process.exit(2); }
  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((err) => { console.error('\n✗ Failed:', err instanceof Error ? err.message : String(err)); process.exit(1); });
