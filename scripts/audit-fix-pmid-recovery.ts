// site/scripts/audit-fix-pmid-recovery.ts
//
// PMID fingerprint recovery (2026-06-11) — fixes the 18 bibReference docs the
// full re-audit found carrying PMIDs that resolve to unrelated papers (report
// §A1; evidence in 01-brand-system/audits/tmp/pmid-bib-shard{1..4}.md).
//
// Every mapping below was recovered from PubMed via citation lookup / title
// search and CONFIRMED by get_article_metadata: title, first author, year, and
// journal all match the stored fields, and in 15/18 cases the stored DOI
// matches the recovered article exactly (identity proof). 18/18 recovered —
// nothing had to be unset.
//
//   doc                              wrong → correct   doi action
//   abe-2004-japanese             15336745 → 15336743  keep (matches)
//   burke-2007-miners             17559974 → 17950195  fix → 10.1016/j.jhse.2005.02.002
//   d498a81c… (Vasiliadis 2014)   24482155 → 24482073  keep; title → PubMed's
//   descatha-2011-occupational    21595972 → 21575231  keep
//   descatha-2014-gazel           24430873 → 24477316  keep
//   dolmans-2011-nejm             21651393 → 21732829  keep
//   hindocha-2009-epidemiology    19294478 → 19145463  keep
//   ketchum-2000-triamcinolone    11119678 → 11119679  keep
//   krause-2011-tgfb              21639869 → 21711521  keep
//   lanting-2014                  24572860 → 24263394  keep
//   larsen-2015-twins             24875733 → 24835475  keep (epub 2014/print 2015)
//   lubahn-1984-open-palm          6693734 → 6693744   fix → 10.1016/s0363-5023(84)80184-7
//   malsagova-2019-spiralling…    31354023 → 31333049  keep
//   rayan-2007-jbjs-review        17200329 → 17256226  keep
//   salari-2020                   33100257 → 33115483  keep
//   schneider-1986-open-palm       3944438 → 3944435   keep; title → PubMed's
//   ullah-2009-firebreak          19258616 → 19258615  keep
//   watson-1979-checkrein           759509 → 759506    set (was null) → 10.1016/s0363-5023(79)80107-0
//
// Idempotent: asserts each doc's CURRENT (wrong) pmid before patching; no-ops
// when already at target; skips with a warning on any unexpected value.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pmid-recovery.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pmid-recovery.ts --commit  # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
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

type Fix = {
  id: string;
  expectPmid: string;
  pmid: string;
  doi?: string; // set only when the stored DOI was wrong/missing
  title?: string; // set only when the stored title was a paraphrase of the PubMed title
};

const FIXES: Fix[] = [
  { id: 'abe-2004-japanese', expectPmid: '15336745', pmid: '15336743' },
  { id: 'burke-2007-miners', expectPmid: '17559974', pmid: '17950195', doi: '10.1016/j.jhse.2005.02.002' },
  {
    id: 'd498a81c-27f1-4698-bb00-2642fa1631e1',
    expectPmid: '24482155',
    pmid: '24482073',
    title: 'Endoscopic release for carpal tunnel syndrome',
  },
  { id: 'descatha-2011-occupational', expectPmid: '21595972', pmid: '21575231' },
  { id: 'descatha-2014-gazel', expectPmid: '24430873', pmid: '24477316' },
  { id: 'dolmans-2011-nejm', expectPmid: '21651393', pmid: '21732829' },
  { id: 'hindocha-2009-epidemiology', expectPmid: '19294478', pmid: '19145463' },
  { id: 'ketchum-2000-triamcinolone', expectPmid: '11119678', pmid: '11119679' },
  { id: 'krause-2011-tgfb', expectPmid: '21639869', pmid: '21711521' },
  { id: 'lanting-2014', expectPmid: '24572860', pmid: '24263394' },
  { id: 'larsen-2015-twins', expectPmid: '24875733', pmid: '24835475' },
  { id: 'lubahn-1984-open-palm', expectPmid: '6693734', pmid: '6693744', doi: '10.1016/s0363-5023(84)80184-7' },
  { id: 'malsagova-2019-spiralling-sheet', expectPmid: '31354023', pmid: '31333049' },
  { id: 'rayan-2007-jbjs-review', expectPmid: '17200329', pmid: '17256226' },
  { id: 'salari-2020', expectPmid: '33100257', pmid: '33115483' },
  {
    id: 'schneider-1986-open-palm',
    expectPmid: '3944438',
    pmid: '3944435',
    title: "Surgery of Dupuytren's disease: a review of the open palm method",
  },
  { id: 'ullah-2009-firebreak', expectPmid: '19258616', pmid: '19258615' },
  { id: 'watson-1979-checkrein', expectPmid: '759509', pmid: '759506', doi: '10.1016/s0363-5023(79)80107-0' },
];

async function main() {
  console.log(`audit-fix-pmid-recovery — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);
  let patched = 0;
  let alreadyDone = 0;
  let skipped = 0;

  for (const fix of FIXES) {
    const doc = await client.fetch<{ pmid: string | null; doi: string | null; title: string } | null>(
      `*[_id == $id][0]{pmid, doi, title}`,
      { id: fix.id },
    );
    if (!doc) {
      console.log(`  ✗ ${fix.id} — not found, SKIP`);
      skipped++;
      continue;
    }
    if (doc.pmid === fix.pmid) {
      console.log(`  = ${fix.id} — already ${fix.pmid} (idempotent no-op)`);
      alreadyDone++;
      continue;
    }
    if (doc.pmid !== fix.expectPmid) {
      console.log(`  ✗ ${fix.id} — current pmid ${doc.pmid} ≠ expected ${fix.expectPmid}; SKIP`);
      skipped++;
      continue;
    }
    const sets: Record<string, string> = { pmid: fix.pmid };
    const notes = [`pmid ${fix.expectPmid} → ${fix.pmid}`];
    if (fix.doi && doc.doi !== fix.doi) {
      sets.doi = fix.doi;
      notes.push(`doi ${doc.doi ?? '(null)'} → ${fix.doi}`);
    }
    if (fix.title && doc.title !== fix.title) {
      sets.title = fix.title;
      notes.push(`title → "${fix.title}"`);
    }
    console.log(`  · ${fix.id}: ${notes.join(' | ')}`);
    if (COMMIT) {
      await client.patch(fix.id).set(sets).commit();
      console.log('      ✓ committed');
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
