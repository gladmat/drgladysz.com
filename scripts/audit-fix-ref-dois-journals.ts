// site/scripts/audit-fix-ref-dois-journals.ts
//
// Audit fix (2026-06-11): reference-metadata corrections from the PMID/DOI
// shard audits (01-brand-system/audits/tmp/pmid-fessh-shard{1,2}.md).
//
// (a) bibReference DOI corrections — article identity verified against PubMed:
//       vanrijssen-2012-rct-5yr  doi → 10.1097/PRS.0b013e31823aea95
//       newport-1990             doi → 10.1016/0363-5023(90)90024-l
//
// (b) fesshReference DOI corrections (shard1 — stored DOI wrong, PMID/article OK):
//       ref-pmid-11227711 → 10.1016/s0278-5919(05)70249-0
//       ref-pmid-15145733 → 10.1016/j.bjps.2004.02.027
//       ref-pmid-15318047 → 10.1097/01.prs.0000130966.16460.3c
//       ref-pmid-18780075 → 10.1007/s11552-007-9037-3
//       ref-pmid-21458120 → 10.1016/j.clinbiomech.2011.03.003
//
// (c) fesshReference null-journal backfill (shard2 — full journal names, to
//     match the existing fesshReference style which uses full names, not ISO
//     abbreviations — verified against 3 sample docs):
//       ref-pmid-27879594 → Plastic and Reconstructive Surgery
//       ref-pmid-29443185 → Neurology: Clinical Practice
//       ref-pmid-37521554 → Journal of Hand Surgery Global Online
//       ref-pmid-5521866  → Orthopedic Clinics of North America
//       ref-pmid-6827050  → Journal of Hand Surgery (American Volume)
//       ref-pmid-8414010  → Neurology
//
// Idempotent: each field is patched only when the current value differs from
// the target. Pre-flight GROQ confirmed each current value matches the audit's
// "stored wrong" string (DOIs) / null (journals); any mismatch is skipped + logged.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-ref-dois-journals.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-ref-dois-journals.ts --commit  # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
// Editor token is the write-capable one in this workspace; developer/write
// tokens are read-only on this dataset (probed 2026-06-11).
const TOKEN =
  process.env.SANITY_API_EDITOR_TOKEN ||
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing SANITY_API_EDITOR_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

// field: which scalar field to set; expectCurrent: the value we expect to find
// before patching (the audit's "stored wrong" / null). target: new value.
type FieldEdit = {
  id: string;
  field: 'doi' | 'journal';
  expectCurrent: string | null;
  target: string;
};

const EDITS: FieldEdit[] = [
  // (a) bibReference DOI corrections
  { id: 'vanrijssen-2012-rct-5yr', field: 'doi', expectCurrent: '10.1097/PRS.0b013e31823aea8f', target: '10.1097/PRS.0b013e31823aea95' },
  { id: 'newport-1990', field: 'doi', expectCurrent: '10.1016/0363-5023(90)90019-n', target: '10.1016/0363-5023(90)90024-l' },
  // (b) fesshReference DOI corrections
  { id: 'ref-pmid-11227711', field: 'doi', expectCurrent: '10.1016/s0278-5919(05)70249-4', target: '10.1016/s0278-5919(05)70249-0' },
  { id: 'ref-pmid-15145733', field: 'doi', expectCurrent: '10.1016/j.bjps.2003.12.029', target: '10.1016/j.bjps.2004.02.027' },
  { id: 'ref-pmid-15318047', field: 'doi', expectCurrent: '10.1097/01.prs.0000131019.91306.b3', target: '10.1097/01.prs.0000130966.16460.3c' },
  { id: 'ref-pmid-18780075', field: 'doi', expectCurrent: '10.1007/s11552-007-9039-1', target: '10.1007/s11552-007-9037-3' },
  { id: 'ref-pmid-21458120', field: 'doi', expectCurrent: '10.1016/j.clinbiomech.2011.02.005', target: '10.1016/j.clinbiomech.2011.03.003' },
  // (c) fesshReference null-journal backfill
  { id: 'ref-pmid-27879594', field: 'journal', expectCurrent: null, target: 'Plastic and Reconstructive Surgery' },
  { id: 'ref-pmid-29443185', field: 'journal', expectCurrent: null, target: 'Neurology: Clinical Practice' },
  { id: 'ref-pmid-37521554', field: 'journal', expectCurrent: null, target: 'Journal of Hand Surgery Global Online' },
  { id: 'ref-pmid-5521866', field: 'journal', expectCurrent: null, target: 'Orthopedic Clinics of North America' },
  { id: 'ref-pmid-6827050', field: 'journal', expectCurrent: null, target: 'Journal of Hand Surgery (American Volume)' },
  { id: 'ref-pmid-8414010', field: 'journal', expectCurrent: null, target: 'Neurology' },
];

async function main() {
  console.log(`audit-fix-ref-dois-journals — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  let patched = 0;
  let alreadyDone = 0;
  let skipped = 0;

  for (const edit of EDITS) {
    const doc = await client.fetch<{ _id: string; value: string | null } | null>(
      `*[_id == $id][0]{_id, "value": ${edit.field}}`,
      { id: edit.id },
    );
    if (!doc) {
      console.log(`  ✗ ${edit.id} — not found, skipping`);
      skipped++;
      continue;
    }
    const current = (doc.value ?? null) as string | null;

    if (current === edit.target) {
      console.log(`  = ${edit.id}.${edit.field} — already "${edit.target}" (idempotent no-op)`);
      alreadyDone++;
      continue;
    }
    if (current !== edit.expectCurrent) {
      console.log(
        `  ✗ ${edit.id}.${edit.field} — current value ${JSON.stringify(current)} ` +
        `does not match expected ${JSON.stringify(edit.expectCurrent)}; SKIPPING (verify manually)`,
      );
      skipped++;
      continue;
    }
    console.log(`  · ${edit.id}.${edit.field}: ${JSON.stringify(current)} → ${JSON.stringify(edit.target)}`);
    if (COMMIT) {
      await client.patch(edit.id).set({ [edit.field]: edit.target }).commit();
      console.log(`      ✓ committed`);
    }
    patched++;
  }

  console.log(`\n  Summary: ${patched} to patch, ${alreadyDone} already-correct, ${skipped} skipped.`);
  if (!COMMIT) console.log('  (dry-run — re-run with --commit to apply)');
  if (skipped > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
