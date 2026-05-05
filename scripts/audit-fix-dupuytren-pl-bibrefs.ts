// site/scripts/audit-fix-dupuytren-pl-bibrefs.ts
//
// Post-seed audit fix (2026-05-05): the aponeurotomia procedure body ingest
// produced 3 duplicate `bibReference` docs because the Vancouver inline-
// bibliography parser failed to split title from journal where journals were
// wrapped in `*asterisks*`. The malformed dupes have the journal/year baked
// into their `title` field. The aponeurotomia procedure's citation marks now
// point at the dupes, not the canonical docs.
//
// This script:
//   1. Walks the body of `procedure-aponeurotomia-iglowa-przezskorna` and
//      patches every citation markDef whose `_ref` matches one of the 3 dupe
//      IDs to point at the canonical ID instead.
//   2. Confirms zero remaining inbound references to each dupe.
//   3. Deletes the 3 dupes.
//
// The Vancouver parser bug itself is fixed in seed-dupuytren-pl-package.ts
// (added `*` to the lookahead char class in the title-split regex). This
// script handles the production data left over by the run.
//
// Idempotent — re-running after a successful fix is a no-op.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/audit-fix-dupuytren-pl-bibrefs.ts

import { createClient } from '@sanity/client';

const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (!TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN,
  useCdn: false,
});

const APONEUROTOMIA_DOC_ID = 'procedure-aponeurotomia-iglowa-przezskorna';

const REPOINTS: Array<{ from: string; to: string; paper: string }> = [
  { from: 'lalonde-2005-multicenter', to: 'lalonde-2005-walant', paper: 'Lalonde 2005 multicenter' },
  { from: 'van-2006-comparison', to: 'van-rijssen-2006-6week-followup', paper: 'van Rijssen 2006 6-week follow-up' },
  { from: 'british-2023-evidencebased', to: 'bsh-2023-dupuytren-best-guideline', paper: 'BSSH 2023 BEST guideline' },
];

interface MarkDef {
  _key: string;
  _type: string;
  reference?: { _type: 'reference'; _ref: string };
}

interface Block {
  _type: string;
  _key: string;
  markDefs?: MarkDef[];
  // Procedure docs may have section-level arrays of blocks; we walk the doc
  // generically and patch any markDef encountered.
}

function patchMarkDefs(
  blocks: Block[] | undefined,
  fromTo: Map<string, string>,
): { patched: number; out: Block[] } {
  if (!blocks) return { patched: 0, out: [] };
  let patched = 0;
  const out = blocks.map((b) => {
    if (!b.markDefs) return b;
    const newMarkDefs = b.markDefs.map((md) => {
      const ref = md.reference?._ref;
      if (ref && fromTo.has(ref)) {
        patched++;
        return {
          ...md,
          reference: { _type: 'reference' as const, _ref: fromTo.get(ref)! },
        };
      }
      return md;
    });
    return { ...b, markDefs: newMarkDefs };
  });
  return { patched, out };
}

async function main() {
  console.log('Step 1: Repoint aponeurotomia citation marks…');
  const fromTo = new Map(REPOINTS.map((r) => [r.from, r.to]));

  const doc = await client.fetch<Record<string, Block[] | undefined> | null>(
    `*[_id == $id][0]`,
    { id: APONEUROTOMIA_DOC_ID },
  );
  if (!doc) {
    console.error(`  ✗ ${APONEUROTOMIA_DOC_ID} not found`);
    process.exit(1);
  }

  // procedurePage sections that contain block arrays with citation marks.
  const FIELDS = [
    'indications',
    'contraindications',
    'anatomy',
    'positioning',
    'approach',
    'closure',
    'aftercare',
    'complications',
    'evidence',
    'patientSummary',
  ];

  const patches: Record<string, Block[]> = {};
  let totalPatched = 0;
  for (const f of FIELDS) {
    const blocks = doc[f];
    if (!blocks) continue;
    const { patched, out } = patchMarkDefs(blocks, fromTo);
    if (patched > 0) {
      patches[f] = out;
      totalPatched += patched;
      console.log(`  · ${f}: ${patched} mark(s) repointed`);
    }
  }

  // keySteps[] is an array of objects each with a `description` block array.
  const keySteps = (doc.keySteps as unknown as Array<{
    _key: string;
    description?: Block[];
    [k: string]: unknown;
  }> | undefined);
  if (keySteps && keySteps.length > 0) {
    let stepsPatched = 0;
    const newSteps = keySteps.map((s) => {
      const { patched, out } = patchMarkDefs(s.description, fromTo);
      if (patched > 0) stepsPatched += patched;
      return { ...s, description: out };
    });
    if (stepsPatched > 0) {
      patches.keySteps = newSteps as unknown as Block[];
      totalPatched += stepsPatched;
      console.log(`  · keySteps: ${stepsPatched} mark(s) repointed`);
    }
  }

  if (totalPatched === 0) {
    console.log('  · No marks needed repointing (already done?)');
  } else {
    await client.patch(APONEUROTOMIA_DOC_ID).set(patches).commit();
    console.log(`  ✓ ${APONEUROTOMIA_DOC_ID} patched (${totalPatched} marks)`);
  }

  console.log('\nStep 2: Confirm dupes are now orphaned…');
  for (const r of REPOINTS) {
    const incoming = await client.fetch<number>(
      'count(*[references($id)])',
      { id: r.from },
    );
    if (incoming > 0) {
      console.error(`  ✗ ${r.from} still has ${incoming} incoming refs — aborting delete`);
      process.exit(1);
    }
    console.log(`  · ${r.from}: 0 incoming refs ✓`);
  }

  console.log('\nStep 3: Delete the 3 orphaned dupe docs…');
  for (const r of REPOINTS) {
    try {
      await client.delete(r.from);
      console.log(`  ✓ deleted ${r.from} (${r.paper})`);
    } catch (err) {
      const e = err as { statusCode?: number };
      if (e.statusCode === 404) {
        console.log(`  · ${r.from} already gone, no-op`);
      } else {
        throw err;
      }
    }
  }

  console.log('\n✓ Cleanup complete.');
}

main().catch((err) => {
  console.error('\n✗ Cleanup failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
