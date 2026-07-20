// site/scripts/audit-fix-citations-2026-07.ts
//
// Citation-integrity remediation, 2026-07. Scope: every bibReference cited on
// a PL page was verified against PubMed. All 94 PMID-bearing cited refs were
// already correct (no fabrications, no wrong-paper mappings). This script:
//   (a) ADDS 32 confidently-recovered PMIDs (+ DOIs where PubMed had one) to
//       cited journal refs that lacked a PMID;
//   (b) FIXES 3 genuine stored-metadata errors surfaced by verification:
//       - molenkamp-2019: wrong journal (Arch Orthop Trauma Surg → BMC
//         Musculoskelet Disord) + full locator;
//       - ref-rellan-2025: stored pages/DOI "100177" pointed to a DIFFERENT
//         paper (a brachial-plexus editorial, PMID 40538644); correct is
//         100165 / 10.1016/j.jham.2024.100165 (PMID 40538647);
//       - therkelsen-2020: pages 330-334 → 326-330;
//   (c) CORRECTS first-author metadata for 3 refs whose stored authors[] had
//       the wrong lead author (verified via PubMed): thomas-2017 (Macey ARM
//       first), beaudreuil-2014 (Bernabé B first), werker-2019 correction
//       (Kan HJ et al.).
// Everything below was confirmed against PubMed. Genuinely unindexed refs
// (pre-MEDLINE Luck excepted — it IS indexed; skoog-1967, komatsu-1968,
// jacobson-1960, carrel-1902, and the too-recent de-roo-2024) are left as-is.
//
// Idempotent (set of scalar fields). Usage (from site/):
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-citations-2026-07.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-citations-2026-07.ts --commit  # apply

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN = process.env.SANITY_API_EDITOR_TOKEN || process.env.SANITY_API_DEVELOPER_TOKEN || '';
if (COMMIT && !TOKEN) { console.error('✗ Missing write token (SANITY_API_EDITOR_TOKEN).'); process.exit(1); }

const client = createClient({
  projectId: 'kwp48q91', dataset: 'production', apiVersion: '2026-01-01',
  token: TOKEN || undefined, useCdn: false,
});

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err; const msg = err instanceof Error ? err.message : String(err);
      if (!/ECONNRESET|ETIMEDOUT|socket hang up|timeout|429|50[234]/i.test(msg) || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw lastErr;
}

type Fix = { pmid?: string; doi?: string; journal?: string; volume?: string; issue?: string; pages?: string; authors?: string[] };

// All values verified against PubMed (2026-07).
const FIXES: Record<string, Fix> = {
  // ── PMID recoveries (journal articles that lacked a PMID) ──
  'augoff-2005-egf-dupuytren':                 { pmid: '15622242', volume: '115', issue: '1', pages: '128-33' },
  'augoff-2005-egfr-dupuytren':                { pmid: '16055243', doi: '10.1016/j.jhsb.2005.06.008' },
  'bainbridge-2012-european-trends-dupuytren': { pmid: '22611457', doi: '10.1007/s12570-012-0092-z', volume: '3', issue: '1', pages: '31-41' },
  'beaudreuil-2011-uram':                      { pmid: '21786431' },
  'beaudreuil-2014-uram-pna':                  { pmid: '24565887', doi: '10.1016/j.jbspin.2014.01.007', volume: '81', issue: '5', pages: '441-4',
                                                 authors: ['Bernabé B', 'Lasbleiz S', 'Gerber RA', 'Cappelleri JC', 'Yelnik A', 'Orcel P', 'Bardin T', 'Beaudreuil J'] },
  'beyermann-2004-pip-capsulotomy':            { pmid: '15142694', doi: '10.1016/j.jhsb.2004.02.002' },
  'bednarek-trybus-2016-pem-questionnaire':    { pmid: '27197428' },
  'craft-2011-soft-tissue-distraction-vs-checkrein': { pmid: '21738085', doi: '10.1097/PRS.0b013e31822b67c9', volume: '128', issue: '5', pages: '1107-13' },
  'felici-2014-recurrence':                    { pmid: '25412239' },
  'hueston-1976-tabletop-test':                { pmid: '979843', doi: '10.5694/j.1326-5377.1976.tb134472.x', volume: '2', issue: '5', pages: '189-90' },
  'hueston-1984-firebreak':                    { pmid: '6380478', doi: '10.1111/j.1445-2197.1984.tb05317.x' },
  'kadhum-2017-radiotherapy-review':           { pmid: '28490266', doi: '10.1177/1753193417695996', volume: '42', issue: '7', pages: '689-692' },
  'kan-2017-recurrence':                       { pmid: '28505187' },
  'lalonde-2005-walant':                       { pmid: '16182068', doi: '10.1016/j.jhsa.2005.05.006', issue: '5' },
  'luck-1959':                                 { pmid: '13664703' },
  'mosier-hughes-2013':                        { pmid: '23895723' },
  'nanchahal-2022-ridd':                       { pmid: '35949922' },
  'panchal-2010-kaplan':                       { pmid: '19806407' },
  'pess-2012-pna':                             { pmid: '22464232' },
  'ref-akrivos-2025':                          { pmid: '40419443', volume: '51', issue: '2', pages: '228-230' },
  'ref-padua-1997':                            { pmid: '9325471' },
  'ritchie-2004-pip-release':                  { pmid: '14734062', doi: '10.1016/j.jhsb.2003.08.005' },
  'van-den-berge-2023-occupational':           { pmid: '36635095', doi: '10.1136/oemed-2022-108670', volume: '80', issue: '3', pages: '137-145' },
  'van-rijssen-2006-6week-followup':           { pmid: '16713831', doi: '10.1016/j.jhsa.2006.02.021' },
  'watchmaker-1996-pcbmn':                     { pmid: '8842959' },
  'ref-ulusoy-2025':                           { pmid: '40428757' },
  'riesmeijer-2024-gwas-hedgehog-notch':       { pmid: '38172110', doi: '10.1038/s41467-023-44451-0', issue: '1' },

  // ── Genuine metadata corrections ──
  'molenkamp-2019-imaging-review':             { pmid: '31101038', doi: '10.1186/s12891-019-2606-0', journal: 'BMC Musculoskelet Disord', volume: '20', issue: '1', pages: '224' },
  'ref-rellan-2025':                           { pmid: '40538647', doi: '10.1016/j.jham.2024.100165', volume: '17', issue: '2', pages: '100165' },
  'therkelsen-2020-pnf-safety':                { pmid: '32056475', pages: '326-330' },

  // ── First-author corrections (PMID recovery + authors[]) ──
  'thomas-2017-serpentine-zone':               { pmid: '29706740', doi: '10.1055/s-0037-1607047', pages: '54-56', authors: ['Macey ARM', 'Thomas R'] },
  'werker-2019-recurrence-correction':         { pmid: '31022293', doi: '10.1371/journal.pone.0216313',
                                                 authors: ['Kan HJ', 'Verrijp FW', 'Hovius SER', 'van Nieuwenhoven CA', 'Selles RW'] },
};

async function main() {
  console.log(`audit-fix-citations-2026-07 — ${COMMIT ? 'COMMIT' : 'DRY-RUN'} — ${Object.keys(FIXES).length} refs`);
  let applied = 0, missing = 0, noop = 0;

  for (const [id, fix] of Object.entries(FIXES)) {
    const doc = await withRetry(
      () => client.fetch<Record<string, unknown> | null>(`*[_id==$id][0]{_id,pmid,doi,journal,volume,issue,pages,authors}`, { id }),
      `fetch ${id}`);
    if (!doc) { console.log(`  ✗ ${id} — NOT FOUND`); missing++; continue; }

    // build the set of fields that actually change
    const set: Record<string, unknown> = {};
    const changes: string[] = [];
    for (const [k, v] of Object.entries(fix)) {
      const cur = (doc as Record<string, unknown>)[k];
      const same = Array.isArray(v) ? JSON.stringify(cur) === JSON.stringify(v) : cur === v;
      if (!same) { set[k] = v; changes.push(`${k}: ${JSON.stringify(cur)} → ${JSON.stringify(v)}`); }
    }
    if (changes.length === 0) { console.log(`  · ${id} — already current`); noop++; continue; }
    console.log(`  · ${id}\n      ${changes.join('\n      ')}`);
    if (COMMIT) { await withRetry(() => client.patch(id).set(set).commit(), `patch ${id}`); console.log('      ✓ committed'); }
    applied++;
  }

  console.log(`\n  ${COMMIT ? 'Committed' : 'Would change'}: ${applied} | already-current: ${noop} | not-found: ${missing}`);
  if (missing > 0) { console.error('✗ Some ids not found — check slugs.'); process.exit(2); }
  if (!COMMIT) console.log('\n(dry-run — re-run with --commit to apply)');
}

main().catch((e) => { console.error('✗ Failed:', e instanceof Error ? e.message : String(e)); process.exit(1); });
