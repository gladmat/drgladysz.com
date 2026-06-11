// site/scripts/audit-fix-bibref-dedup.ts
//
// One-shot, idempotent dedup of 6 fingerprint-collision bibReference groups
// flagged by the 2026-06-11 structural audit (F3). In each group the same
// publication was seeded twice: a `bibref-`-prefixed copy (null pmid, sometimes
// corrupted author/DOI data) duplicating a pre-existing canonical doc that
// carries the real PMID. Fix path (mirrors cleanup-uuid-bibref-orphans.ts):
//   - Re-point every inbound citation markDef reference._ref from the dupe `_id`
//     to the canonical `_id`. Walk recurses through article body[] AND every
//     procedurePage section array (indications/contraindications/anatomy/
//     positioning/approach/keySteps/closure/aftercare/complications/evidence/
//     patientSummary), descending into callout.content[] and
//     procedureStep.description[] where citation marks also live.
//   - Verify count(references(<dupe>)) == 0 AFTER repointing; refuse to delete
//     otherwise.
//   - Delete the dupe doc.
//
// Groups verified by GROQ + PubMed before this script was written (see the
// session report). Canonical = the PMID-bearing twin where one exists; for the
// book/guideline pairs (no PMID exists for either) the established non-`bibref-`
// doc is canonical. The Lalonde 2020 and 2021 pairs are deduped WITHIN each
// year only — the cross-year (2020 vs 2021) edition question is NOT touched
// here (flagged separately for manual resolution).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-bibref-dedup.ts            # dry run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-bibref-dedup.ts --commit   # write

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');

const TOKEN =
  process.env.SANITY_API_EDITOR_TOKEN ||
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN;
if (!TOKEN) {
  console.error(
    'Error: no write token. Add SANITY_API_EDITOR_TOKEN (preferred) to .env.local.',
  );
  process.exit(1);
}

const client = createClient({
  projectId: 'kwp48q91',
  dataset: 'production',
  apiVersion: '2026-01-01',
  useCdn: false,
  token: TOKEN,
});

// dupe → canonical. Each confirmed same-publication (title/author/year), with the
// canonical carrying the real PMID where the publication type has one.
const GROUPS: Array<{ dupe: string; canonical: string; label: string }> = [
  { dupe: 'bibref-aaos-cts-cpg-2024', canonical: 'aaos-2024-cts-cpg', label: 'AAOS 2024 CTS CPG' },
  { dupe: 'bibref-lalonde-2020-walant-book', canonical: 'lalonde-2020-walant-book', label: 'Lalonde 2020 WALANT book' },
  { dupe: 'bibref-lalonde-2021-walant-book', canonical: 'ref-lalonde-2021', label: 'Lalonde 2021 WALANT book' },
  { dupe: 'bibref-lee-1996-mini-incision', canonical: 'ref-lee-1996', label: 'Lee 1996 mini-incision CTR (PMID 8724579)' },
  { dupe: 'bibref-lundborg-1992-pathophys', canonical: 'ref-lundborg-1992', label: 'Lundborg 1992 nerve-compression pathophys (PMID 1613031)' },
  { dupe: 'bibref-mackinnon-1991-internal-neurolysis', canonical: 'mackinnon-1991-internal-neurolysis', label: 'Mackinnon 1991 internal neurolysis (PMID 2022828)' },
  { dupe: 'bibref-bonatz-2024-pillar-pain-meta', canonical: 'bonatz-2024-pillar-pain', label: 'Pillar-pain meta-analysis (PMID 38903842, Kumar & Lawson-Smith)' },
];

// Top-level PT-bearing fields per doc type.
const ARTICLE_FIELDS = ['body'];
const PROCEDURE_FIELDS = [
  'indications', 'contraindications', 'anatomy', 'positioning', 'approach',
  'keySteps', 'closure', 'aftercare', 'complications', 'evidence', 'patientSummary',
];

type Node = {
  _type?: string;
  markDefs?: Array<{ reference?: { _ref?: string } }>;
  content?: unknown[];     // callout
  description?: unknown[]; // procedureStep
  [k: string]: unknown;
};

// Recursively repoint every markDef reference._ref === dupe → canonical, in
// this node's own markDefs and inside any nested content[] (callout) or
// description[] (procedureStep) PT arrays. Returns [newNode, changeCount].
function repointNode(node: unknown, dupe: string, canonical: string): [unknown, number] {
  if (!node || typeof node !== 'object') return [node, 0];
  const n = node as Node;
  let changed = 0;
  const next: Node = { ...n };

  if (Array.isArray(n.markDefs)) {
    next.markDefs = n.markDefs.map((md) => {
      if (md?.reference?._ref === dupe) {
        changed++;
        return { ...md, reference: { ...md.reference, _ref: canonical } };
      }
      return md;
    });
  }
  for (const arrField of ['content', 'description'] as const) {
    if (Array.isArray(n[arrField])) {
      const out = (n[arrField] as unknown[]).map((child) => {
        const [c, d] = repointNode(child, dupe, canonical);
        changed += d;
        return c;
      });
      next[arrField] = out;
    }
  }
  return [next, changed];
}

function repointArray(arr: unknown, dupe: string, canonical: string): [unknown[], number] {
  if (!Array.isArray(arr)) return [arr as unknown[], 0];
  let changed = 0;
  const out = arr.map((item) => {
    const [n, d] = repointNode(item, dupe, canonical);
    changed += d;
    return n;
  });
  return [out, changed];
}

async function refsTo(id: string): Promise<{ _id: string; _type: string }[]> {
  return client.fetch(`*[references($id)]{_id, _type}`, { id });
}

let mergedCount = 0;
let skippedCount = 0;
let totalMarkDefs = 0;

console.log(`\n=== bibReference dedup ${COMMIT ? '(COMMIT — writing)' : '(DRY RUN)'} ===\n`);

for (const g of GROUPS) {
  console.log(`GROUP: ${g.label}`);
  const dupeExists = await client.fetch<boolean>(`defined(*[_id == $id][0]._id)`, { id: g.dupe });
  const canonicalExists = await client.fetch<boolean>(`defined(*[_id == $id][0]._id)`, { id: g.canonical });

  if (!dupeExists) {
    console.log(`  ✓ already merged — dupe ${g.dupe} does not exist. Nothing to do.\n`);
    continue;
  }
  if (!canonicalExists) {
    console.log(`  ⚠ SKIP — canonical ${g.canonical} missing; refusing to repoint into a non-existent doc.\n`);
    skippedCount++;
    continue;
  }

  const incoming = await refsTo(g.dupe);
  console.log(`  dupe:      ${g.dupe}`);
  console.log(`  canonical: ${g.canonical}`);
  console.log(`  inbound refs: ${incoming.length}${incoming.length ? ' → ' + incoming.map((r) => r._id).join(', ') : ''}`);

  let groupMarkDefs = 0;

  for (const src of incoming) {
    const fields = src._type === 'procedurePage' ? PROCEDURE_FIELDS
      : src._type === 'article' ? ARTICLE_FIELDS
      : null;
    if (!fields) {
      console.log(`    ⚠ ${src._type} ${src._id} — unhandled doc type; inspect manually.`);
      continue;
    }
    const doc = await client.fetch<Record<string, unknown> | null>(
      `*[_id == $id][0]{${fields.join(', ')}}`,
      { id: src._id },
    );
    if (!doc) continue;

    const setOps: Record<string, unknown> = {};
    let docChanged = 0;
    for (const field of fields) {
      if (!Array.isArray(doc[field])) continue;
      const [newArr, d] = repointArray(doc[field], g.dupe, g.canonical);
      if (d > 0) {
        setOps[field] = newArr;
        docChanged += d;
      }
    }

    if (docChanged > 0) {
      groupMarkDefs += docChanged;
      console.log(`    ${src._type} ${src._id}: ${docChanged} markDef(s) in [${Object.keys(setOps).join(', ')}]`);
      if (COMMIT) {
        await client.patch(src._id).set(setOps).commit();
        console.log(`      ✓ patched`);
      }
    } else {
      console.log(`    ${src._type} ${src._id}: 0 markDefs found via walker (referenced via a non-PT path?) — inspect.`);
    }
  }

  totalMarkDefs += groupMarkDefs;

  // Re-verify zero inbound references before deleting.
  if (COMMIT) {
    const remaining = await refsTo(g.dupe);
    if (remaining.length > 0) {
      console.log(`  ⚠ ${remaining.length} ref(s) still point at ${g.dupe} after repoint; REFUSING to delete.`);
      console.log(`    Remaining: ${remaining.map((r) => r._id).join(', ')}\n`);
      skippedCount++;
      continue;
    }
    await client.delete(g.dupe);
    console.log(`  ✓ deleted ${g.dupe} (${groupMarkDefs} markDefs repointed)\n`);
    mergedCount++;
  } else {
    console.log(`  [dry-run] would repoint ${groupMarkDefs} markDef(s) then delete ${g.dupe}\n`);
    mergedCount++;
  }
}

console.log(`=== Summary ===`);
console.log(`  Groups ${COMMIT ? 'merged' : 'to merge'}: ${mergedCount}`);
console.log(`  Skipped: ${skippedCount}`);
console.log(`  Total markDefs ${COMMIT ? 'repointed' : 'to repoint'}: ${totalMarkDefs}`);
if (!COMMIT) console.log(`\n  Dry run only. Re-run with --commit to write.`);
