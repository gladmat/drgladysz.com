// site/scripts/audit-fix-pl-2026-07-supplement2.ts
//
// Second supplemental pass (2026-07). Stragglers surfaced by the post-commit
// corpus sweep that the per-document audits missed:
//   1. glossary-microvascular-anastomosis: "ucieplenie" → "ocieplenie"
//      (same orthographic slip fixed in article-wolne-platy s94).
//   2. "raportować" discourse-calque ("a study reports X") → natural Polish
//      (podać / opisać). PRESERVES the fixed term "wyniki raportowane przez
//      pacjenta" (patient-reported outcomes) — only the verb/participle form
//      used for study reporting is replaced.
//
// Same span-substring approach; expected-count guarded; idempotent.
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-2026-07-supplement2.ts [--commit]

import { createClient } from '@sanity/client';
const COMMIT = process.argv.includes('--commit');
const TOKEN = process.env.SANITY_API_EDITOR_TOKEN || process.env.SANITY_API_DEVELOPER_TOKEN || '';
if (COMMIT && !TOKEN) { console.error('✗ Missing write token.'); process.exit(1); }
const client = createClient({ projectId: 'kwp48q91', dataset: 'production', apiVersion: '2026-01-01', token: TOKEN || undefined, useCdn: false });

type Rep = { find: string; replace: string; expected: number };
type Edit = { id: string; fields: string[]; reps: Rep[] };

const EDITS: Edit[] = [
  { id: 'glossary-microvascular-anastomosis', fields: ['fullDefinitionPolish'], reps: [
    { find: 'wypełnianie kapilarne, ucieplenie)', replace: 'wypełnianie kapilarne, ocieplenie)', expected: 1 },
  ] },
  { id: 'article-choroba-dupuytrena-leczenie-operacyjne', fields: ['body'], reps: [
    { find: 'raportując 79% poprawy goniometrycznej', replace: 'podając 79% poprawy goniometrycznej', expected: 1 },
    { find: 'raportuje hamowanie progresji', replace: 'opisuje hamowanie progresji', expected: 1 },
    { find: 'surowości raportowanych liczb', replace: 'surowości podawanych liczb', expected: 1 },
    { find: 'dla raportowania własnej praktyki', replace: 'dla opisu własnej praktyki', expected: 1 },
  ] },
  { id: 'article-zespol-ciesni-nadgarstka-przeglad-kliniczny', fields: ['body'], reps: [
    { find: 'raportuje rozdwojony nerw pośrodkowy w 8,6%', replace: 'podaje rozdwojony nerw pośrodkowy w 8,6%', expected: 1 },
    { find: 'Wyższe wskaźniki wykrywalności są raportowane', replace: 'Wyższe wskaźniki wykrywalności są podawane', expected: 1 },
  ] },
];

type Block = { _type: string; _key?: string; children?: { text?: string }[]; content?: Block[] };
function patch(blocks: Block[], reps: Rep[], hits: Map<string, number>): Block[] {
  return blocks.map((b) => {
    let nb = b;
    if (b._type === 'block' && Array.isArray(b.children)) {
      nb = { ...b, children: b.children.map((c) => {
        if (typeof c.text !== 'string') return c;
        let t = c.text;
        for (const r of reps) if (t.includes(r.find)) { hits.set(r.find, (hits.get(r.find) || 0) + (t.split(r.find).length - 1)); t = t.split(r.find).join(r.replace); }
        return t === c.text ? c : { ...c, text: t };
      }) };
    }
    if (Array.isArray((nb as Block).content)) nb = { ...nb, content: patch((nb as Block).content as Block[], reps, hits) };
    return nb;
  });
}

async function main() {
  console.log(`supplement2 — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  let bad = false;
  for (const e of EDITS) {
    const proj = e.fields.map((f) => `"${f}": ${f}`).join(', ');
    const doc = await client.fetch<Record<string, Block[]>>(`*[_id==$id][0]{${proj}}`, { id: e.id });
    if (!doc) { console.log(`  ✗ ${e.id} not found`); bad = true; continue; }
    const hits = new Map<string, number>();
    const set: Record<string, Block[]> = {};
    for (const f of e.fields) if (Array.isArray(doc[f])) set[f] = patch(doc[f], e.reps, hits);
    console.log(`  · ${e.id}`);
    for (const r of e.reps) { const h = hits.get(r.find) || 0; console.log(`      ${h === r.expected ? '✓' : '✗'} ${h}× (exp ${r.expected}) "${r.find.slice(0, 44)}…"`); if (h !== r.expected) bad = true; }
    if (COMMIT && !bad) { await client.patch(e.id).set(set).commit(); console.log('      ✓ committed'); }
  }
  if (bad) { console.error('✗ mismatch'); process.exit(2); }
  if (!COMMIT) console.log('(dry-run)');
}
main().catch((e) => { console.error(e); process.exit(1); });
