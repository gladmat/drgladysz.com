// site/scripts/backfill-octr-related.ts
//
// One-shot patch to set the Open Carpal Tunnel Release procedure page's
// relatedArticles[] to point at the two new CTS articles. Run after both
// articles seed (Part 2 of the May 2026 CTS content drop).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/backfill-octr-related.ts

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

const PROCEDURE_ID = 'e238943e-dc53-40ad-b02c-b4ba2ed07702';
const RELATED_ARTICLE_IDS = [
  'article-carpal-tunnel-syndrome',           // patient guide
  'article-carpal-tunnel-syndrome-fessh-prep', // FESSH-prep article
];

const refs = RELATED_ARTICLE_IDS.map((id, i) => ({
  _key: `ra-${i}`,
  _type: 'reference' as const,
  _ref: id,
}));

console.log(`Patching procedure ${PROCEDURE_ID} relatedArticles[]…`);
const result = await client.patch(PROCEDURE_ID).set({ relatedArticles: refs }).commit();
console.log(`✓ Patched. Live relatedArticles count: ${(result.relatedArticles as unknown[]).length}`);
