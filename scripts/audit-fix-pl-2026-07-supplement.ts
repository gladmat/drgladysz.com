// site/scripts/audit-fix-pl-2026-07-supplement.ts
// Supplemental to audit-fix-pl-2026-07-linguistic.ts: a third "unaczynniony"
// (double-n orthographic error) occurrence surfaced by the post-commit sweep
// in article-wolne-platy span s108 (VLNT sentence). Same span-substring
// approach; idempotent; expected-count guarded.
//
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-pl-2026-07-supplement.ts [--commit]

import { createClient } from '@sanity/client';
const COMMIT = process.argv.includes('--commit');
const TOKEN = process.env.SANITY_API_EDITOR_TOKEN || process.env.SANITY_API_DEVELOPER_TOKEN || '';
if (COMMIT && !TOKEN) { console.error('✗ Missing write token.'); process.exit(1); }
const client = createClient({ projectId: 'kwp48q91', dataset: 'production', apiVersion: '2026-01-01', token: TOKEN || undefined, useCdn: false });

const ID = 'article-wolne-platy';
const FIND = 'przeszczep węzłów chłonnych unaczynniony';
const REPLACE = 'unaczyniony przeszczep węzłów chłonnych';

async function main() {
  const doc = await client.fetch<{ body?: { _type: string; children?: { text?: string }[] }[] }>(`*[_id==$id][0]{body}`, { id: ID });
  if (!doc?.body) { console.error('✗ not found'); process.exit(1); }
  let hits = 0;
  const body = doc.body.map((b) => {
    if (b._type !== 'block' || !Array.isArray(b.children)) return b;
    return { ...b, children: b.children.map((c) => {
      if (typeof c.text !== 'string' || !c.text.includes(FIND)) return c;
      hits += c.text.split(FIND).length - 1;
      return { ...c, text: c.text.split(FIND).join(REPLACE) };
    }) };
  });
  console.log(`${COMMIT ? 'COMMIT' : 'DRY-RUN'}: ${hits} hit(s) (expected 1)`);
  if (hits !== 1) { console.error('✗ unexpected hit count'); process.exit(2); }
  if (COMMIT) { await client.patch(ID).set({ body }).commit(); console.log('✓ committed'); }
}
main().catch((e) => { console.error(e); process.exit(1); });
