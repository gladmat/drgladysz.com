// site/scripts/audit-fix-dupuytren-strip-inline-references.ts
//
// Post-seed audit fix (2026-05-05): the Dupuytren EN FESSH-prep and PL expert
// articles ship with an inline `## References` / `## Piśmiennictwo` body
// section that the seed scripts didn't strip. The Astro [slug].astro template
// also renders a `<Bibliography>` component built from the in-body citation
// marks. Result: bibliography rendered twice on each page.
//
// This script truncates the `body` array of each affected doc at the
// boundary h2 block. The Bibliography component continues to render the
// canonical numbered list at the foot.
//
// Idempotent: if the boundary block is no longer present, the script logs
// "already truncated" and exits cleanly.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   SANITY_API_DEVELOPER_TOKEN=<token> node --experimental-strip-types --env-file=.env.local scripts/audit-fix-dupuytren-strip-inline-references.ts

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

const TARGETS: Array<{ id: string; boundaryHeading: string }> = [
  {
    id: 'article-dupuytrens-disease-fessh-prep',
    boundaryHeading: 'References',
  },
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    boundaryHeading: 'Piśmiennictwo',
  },
];

interface Block {
  _type: string;
  _key: string;
  style?: string;
  children?: Array<{ text?: string }>;
}

async function main() {
  for (const t of TARGETS) {
    console.log(`\n→ ${t.id}`);
    const doc = await client.fetch<{ body?: Block[] } | null>(
      '*[_id == $id][0]{body}',
      { id: t.id },
    );
    if (!doc?.body) {
      console.error(`  ✗ doc not found or has no body`);
      continue;
    }
    const original = doc.body;
    const idx = original.findIndex(
      (b) =>
        b._type === 'block' &&
        b.style === 'h2' &&
        (b.children?.[0]?.text || '').trim() === t.boundaryHeading,
    );
    if (idx < 0) {
      console.log(
        `  · "${t.boundaryHeading}" h2 not found in body — already truncated?`,
      );
      continue;
    }
    const truncated = original.slice(0, idx);
    console.log(
      `  · removing ${original.length - idx} blocks (from index ${idx} onwards)`,
    );
    await client.patch(t.id).set({ body: truncated }).commit();
    console.log(`  ✓ patched (body length ${original.length} → ${truncated.length})`);
  }
  console.log('\n✓ Done.');
}

main().catch((err) => {
  console.error('\n✗ Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
