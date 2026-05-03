// site/scripts/cleanup-uuid-bibref-orphans.ts
//
// One-shot cleanup of Phase-5 UUID bibReference dupes that have a slug-form
// equivalent. For each dupe:
//   - Re-point any inbound citation marks (in article body, procedure body,
//     etc.) from the UUID `_ref` to the slug-form `_id`.
//   - Delete the UUID doc.
//
// Identified by length(_id) == 36 + matching PMID with another bibReference.
// UUIDs without a slug-form duplicate are kept (they're unique citations,
// just authored under UUID instead of slug-form `_id`).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/cleanup-uuid-bibref-orphans.ts

import { createClient } from '@sanity/client';

const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN;
if (!TOKEN) {
  console.error('Error: no write token. Add SANITY_API_DEVELOPER_TOKEN to .env.local.');
  process.exit(1);
}

const client = createClient({
  projectId: 'kwp48q91',
  dataset: 'production',
  apiVersion: '2026-01-01',
  useCdn: false,
  token: TOKEN,
});

type Dupe = {
  _id: string;
  title: string;
  pmid: string | null;
  duplicateByPmid: { _id: string; title: string } | null;
  incomingRefs: { _id: string; _type: string; title: string }[];
};

const dupes = await client.fetch<Dupe[]>(`*[_type == "bibReference" && length(_id) == 36]{
  _id,
  title,
  pmid,
  "duplicateByPmid": *[_type == "bibReference" && _id != ^._id && pmid == ^.pmid && defined(pmid) && pmid != ""][0]{_id, title},
  "incomingRefs": *[references(^._id)]{_id, _type, title}
}`);

console.log(`Found ${dupes.length} UUID-form bibReference doc(s).`);

let deletedCount = 0;
let skippedCount = 0;

for (const d of dupes) {
  if (!d.duplicateByPmid) {
    console.log(`  SKIP ${d._id} — "${d.title}" — no slug-form duplicate (unique citation, kept).`);
    skippedCount++;
    continue;
  }
  const slugFormId = d.duplicateByPmid._id;
  console.log(`\n  DUPE: ${d._id} → ${slugFormId} ("${d.title}")`);
  console.log(`    Inbound refs: ${d.incomingRefs.length}`);

  // For each inbound doc, walk its body[] looking for markDefs whose
  // reference._ref equals the UUID. Patch them to point at the slug-form _id.
  for (const src of d.incomingRefs) {
    console.log(`    Patching ${src._type} ${src._id}...`);
    type Block = { markDefs?: Array<{ reference?: { _ref?: string } }>; [k: string]: unknown };
    let changed = 0;
    const setOps: Record<string, unknown> = {};

    // Walk top-level body if present (article doc convention).
    const sourceDoc = await client.fetch<{ body?: unknown[] } | null>(
      `*[_id == $id][0]{body}`,
      { id: src._id },
    );
    if (sourceDoc?.body && Array.isArray(sourceDoc.body)) {
      let bodyChanged = 0;
      const newBody = (sourceDoc.body as Block[]).map((block) => {
        if (!block.markDefs || !Array.isArray(block.markDefs)) return block;
        const newMarkDefs = block.markDefs.map((md) => {
          if (md.reference?._ref === d._id) {
            bodyChanged++;
            return { ...md, reference: { ...md.reference, _ref: slugFormId } };
          }
          return md;
        });
        return { ...block, markDefs: newMarkDefs };
      });
      if (bodyChanged > 0) {
        setOps.body = newBody;
        changed += bodyChanged;
      }
    }

    // For procedure pages, also walk the AO section bodies.
    if (src._type === 'procedurePage') {
      const sectionFields = ['indications', 'contraindications', 'anatomy', 'positioning', 'approach', 'keySteps', 'closure', 'aftercare', 'complications', 'evidence', 'patientSummary'];
      const procDoc = await client.fetch<Record<string, unknown> | null>(
        `*[_id == $id][0]{${sectionFields.join(', ')}}`,
        { id: src._id },
      );
      if (procDoc) {
        for (const field of sectionFields) {
          const val = procDoc[field];
          if (!Array.isArray(val)) continue;
          let fieldChanged = 0;
          const newVal = (val as Block[]).map((block) => {
            if (!block.markDefs || !Array.isArray(block.markDefs)) return block;
            const newMarkDefs = block.markDefs.map((md) => {
              if (md.reference?._ref === d._id) {
                fieldChanged++;
                return { ...md, reference: { ...md.reference, _ref: slugFormId } };
              }
              return md;
            });
            return { ...block, markDefs: newMarkDefs };
          });
          if (fieldChanged > 0) {
            setOps[field] = newVal;
            changed += fieldChanged;
          }
        }
      }
    }

    if (changed > 0) {
      await client.patch(src._id).set(setOps).commit();
      console.log(`      ✓ patched ${changed} citation mark(s) across ${Object.keys(setOps).length} field(s)`);
    } else {
      console.log(`      no citation marks pointed at this UUID — possibly referenced via relatedX[] only`);
      // Patch relatedArticles/relatedProcedures arrays directly.
      await client
        .patch(src._id)
        .unset([
          `relatedArticles[_ref=="${d._id}"]`,
          `relatedProcedures[_ref=="${d._id}"]`,
        ])
        .commit();
      console.log(`      ✓ stripped relatedArticles/relatedProcedures entries`);
    }
  }

  // Re-check: are there any inbound refs left?
  const remaining = await client.fetch<{ _id: string }[]>(
    `*[references($id)]{_id}`,
    { id: d._id },
  );
  if (remaining.length > 0) {
    console.log(`    ⚠ ${remaining.length} ref(s) still pointing at ${d._id}; cannot delete safely`);
    console.log(`      Remaining: ${remaining.map((r) => r._id).join(', ')}`);
    skippedCount++;
    continue;
  }

  console.log(`    Deleting ${d._id}...`);
  await client.delete(d._id);
  console.log(`    ✓ Deleted`);
  deletedCount++;
}

console.log(`\n=== Summary ===`);
console.log(`  Deleted: ${deletedCount}`);
console.log(`  Skipped: ${skippedCount}`);
