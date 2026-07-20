// site/scripts/export-cited-refs.ts
// Export stored metadata for every bibReference cited on a PL page → JSON.
// Read-only. Usage:
//   node --experimental-strip-types --env-file=.env.local scripts/export-cited-refs.ts <outFile>

import { createClient } from '@sanity/client';
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/cited-refs.json';

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_EDITOR_TOKEN || process.env.SANITY_API_DEVELOPER_TOKEN || undefined,
  useCdn: false,
});

const PROC_SECTIONS = [
  'anatomy', 'indications', 'contraindications', 'positioning', 'approach',
  'keySteps', 'closure', 'aftercare', 'complications', 'evidence', 'summary', 'patientSummary',
];

async function main() {
  // collect cited ref ids from PL articles (body) + PL procedures (all sections)
  const procRefExpr = PROC_SECTIONS
    .map((s) => `*[_type=="procedurePage" && language=="pl"].${s}[].markDefs[_type=="citation"].reference._ref`)
    .join(' + ');
  const ids = await client.fetch<string[]>(
    `array::unique(
      *[_type=="article" && language=="pl"].body[].markDefs[_type=="citation"].reference._ref
      + ${procRefExpr}
    )`,
  );
  const cleanIds = ids.filter((x): x is string => typeof x === 'string');

  // fetch metadata + which PL docs cite each ref
  const refs = await client.fetch(
    `*[_type=="bibReference" && _id in $ids]{
      _id, title, authors, journal, year, volume, issue, pages, pmid, doi, pmcid, pubType,
      "citedByPl": array::unique(
        *[_type=="article" && language=="pl" && references match "" ]._id
      )
    }`,
    { ids: cleanIds },
  );

  // fingerprint dupe detection across ALL bibRefs (not only cited): same first-author+year+title-ish
  const allRefs = await client.fetch(
    `*[_type=="bibReference"]{_id, title, authors, year, pmid, doi}`,
  );

  writeFileSync(OUT, JSON.stringify({
    citedIds: cleanIds,
    citedCount: cleanIds.length,
    refs,
    allRefsForDupeCheck: allRefs,
  }, null, 2));
  console.log(`Cited refs: ${cleanIds.length} unique. Fetched metadata for ${refs.length}. Total bibRefs: ${allRefs.length}. → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
