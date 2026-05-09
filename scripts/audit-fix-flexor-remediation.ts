// site/scripts/audit-fix-flexor-remediation.ts
//
// Forensic-audit remediation for /en/blog/flexor-tendon-injuries-and-repair
// (article-flexor-tendon-injuries-and-repair). Source of authority:
// 01-brand-system/inbox/REMEDIATION flexor.md (audit dated 2026-05-09).
//
// Applies 7 body-text fixes (3 HIGH, 2 MEDIUM, 2 LOW) and 1 glossary fix.
// All references already exist as bibReference docs — no creates needed.
//
// Idempotent (substring replace + change-detection per span).
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-flexor-remediation.ts
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-flexor-remediation.ts --dry-run

import { createClient } from '@sanity/client';

const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (!TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN,
  useCdn: false,
});

const ARTICLE_ID = 'article-flexor-tendon-injuries-and-repair';
const GLOSSARY_ID = 'glossary-itame';

interface Patch {
  id: string;
  blockKey: string;
  spanKey: string;
  find: string;
  replace: string;
  description: string;
}

// Body-span text patches. Each `find` is a substring of the target span; the
// substring is replaced by `replace`. Idempotent — if `find` is not present
// (because the patch already ran or the span shifted), the patch is skipped
// and logged.
const BODY_PATCHES: Patch[] = [
  {
    id: 'H1',
    blockKey: 'b24',
    spanKey: 's63',
    find: "Lim and Tsai's four-strand cruciate repair in the mid-1990s",
    replace:
      "Lim and Tsai's six-strand double-loop repair (Atlas Hand Clin 1996;1:65–76)",
    description:
      'Lim & Tsai is six-strand double-loop, not four-strand cruciate (audit H1)',
  },
  {
    id: 'H2',
    blockKey: 'b43',
    spanKey: 's99',
    find: '2012 meta-analysis of 138 articles and 4,145 repairs',
    replace: '2012 meta-analysis (29 studies)',
    description: 'Dy 2012 sample-size figures unverified (audit H2)',
  },
  {
    id: 'H3',
    blockKey: 'b31',
    spanKey: 's80',
    find: "Tang's IIb or IIc territory",
    replace: "Tang's IIa or IIb territory",
    description: 'Internal contradiction in Tang sub-zone topology (audit H3)',
  },
  {
    id: 'M1a',
    blockKey: 'b20',
    spanKey: 's53',
    find: '7 of 122 tendons',
    replace: 'seven patients',
    description:
      'iTAMe gapping is per-patient not per-tendon (audit M1, first occurrence)',
  },
  {
    id: 'M1b',
    blockKey: 'b44',
    spanKey: 's102',
    find: 'the 7 of 122 tendons',
    replace: 'the seven patients',
    description: 'iTAMe gapping per-patient (audit M1, second occurrence)',
  },
  {
    id: 'L1',
    blockKey: 'b40',
    spanKey: 's93',
    find: 'A 2022 zone-II-specific meta-analysis',
    replace: 'A 2023 zone-II-specific meta-analysis',
    description:
      'Xu 2023 print year (epub 2022); align body with reference list (audit L1)',
  },
  {
    id: 'L3',
    blockKey: 'b8',
    spanKey: 's26',
    find: "Tang's IIa, IIb, IIc, and IId sub-zones correspond, respectively, to the FDS insertion, the vincular portion between the insertion and the distal edge of A2, the segment beneath A2, and the proximal portion at A1 and proximal to A2",
    replace:
      "Tang's IIa, IIb, IIc, and IId sub-zones correspond, respectively, to the area distal to the FDS insertion containing A4, the segment between A4 and A2 containing the FDS chiasm and A3, the segment beneath A2, and the segment at A1",
    description: 'Tang IIb description tightened to mention FDS chiasm (audit L3)',
  },
  {
    id: 'L4',
    blockKey: 'b6',
    spanKey: 's13',
    find: 'most consistent across cadaveric series',
    replace: 'most consistent in the published anatomy',
    description:
      'Doyle 1989 is a review, not a cadaveric primary series (audit L4)',
  },
];

// Glossary text patches. The shortDefinition is a plain string; fullDefinition
// is portable text whose first child holds the narrative paragraph.
const GLOSSARY_SHORTDEF_FIND =
  '7 of 122 tendons in their original 2010 series; all 7 were re-repaired';
const GLOSSARY_SHORTDEF_REPLACE =
  'seven patients in their original 2010 series; all seven were re-repaired';

const GLOSSARY_FULLDEF_FIND = 'detected in 7 tendons and corrected';
const GLOSSARY_FULLDEF_REPLACE = 'detected in seven patients and corrected';

interface Span {
  _key: string;
  text?: string;
  marks?: string[];
}
interface Block {
  _key: string;
  _type?: string;
  style?: string;
  children?: Span[];
  markDefs?: unknown[];
}

async function main() {
  console.log(
    `→ Flexor remediation${DRY_RUN ? ' (DRY RUN)' : ''}: applying ${BODY_PATCHES.length} body patches + glossary fix\n`,
  );

  // ---- Article body patches ----
  // Fetch the full document so createOrReplace preserves _type, slug, title,
  // standfirst, language, references, etc.
  const article = await client.fetch<({ _id: string; body: Block[] } & Record<string, unknown>) | null>(
    `*[_id == $id][0]`,
    { id: ARTICLE_ID },
  );
  if (!article) {
    console.error(`✗ Article ${ARTICLE_ID} not found.`);
    process.exit(1);
  }

  let bodyChanged = false;
  for (const patch of BODY_PATCHES) {
    const block = article.body.find((b) => b._key === patch.blockKey);
    if (!block || !block.children) {
      console.warn(`  ⚠ ${patch.id}: block ${patch.blockKey} not found — skipping`);
      continue;
    }
    const span = block.children.find((s) => s._key === patch.spanKey);
    if (!span || typeof span.text !== 'string') {
      console.warn(
        `  ⚠ ${patch.id}: span ${patch.blockKey}/${patch.spanKey} not found — skipping`,
      );
      continue;
    }
    if (span.text.includes(patch.replace) && !span.text.includes(patch.find)) {
      console.log(`  · ${patch.id}: already applied (${patch.description})`);
      continue;
    }
    if (!span.text.includes(patch.find)) {
      console.warn(
        `  ⚠ ${patch.id}: target string not found in ${patch.blockKey}/${patch.spanKey} — skipping (manual review)`,
      );
      continue;
    }
    const before = span.text;
    span.text = before.replace(patch.find, patch.replace);
    bodyChanged = true;
    console.log(`  ✓ ${patch.id}: ${patch.description}`);
  }

  if (bodyChanged) {
    if (DRY_RUN) {
      console.log('\n  (dry-run: skipping article write)');
    } else {
      await client.createOrReplace({ ...article });
      console.log('  ✓ article body written');
    }
  } else {
    console.log('  · no article body changes');
  }

  // ---- Glossary patches ----
  console.log('\n→ Glossary patches (glossary-itame):');
  const itame = await client.fetch<({ _id: string; shortDefinition?: string; fullDefinition?: Block[] } & Record<string, unknown>) | null>(
    `*[_id == $id][0]`,
    { id: GLOSSARY_ID },
  );
  if (!itame) {
    console.error(`✗ Glossary ${GLOSSARY_ID} not found.`);
    process.exit(1);
  }

  let glossaryChanged = false;
  if (itame.shortDefinition?.includes(GLOSSARY_SHORTDEF_FIND)) {
    itame.shortDefinition = itame.shortDefinition.replace(
      GLOSSARY_SHORTDEF_FIND,
      GLOSSARY_SHORTDEF_REPLACE,
    );
    glossaryChanged = true;
    console.log('  ✓ shortDefinition: 7 of 122 tendons → seven patients');
  } else if (itame.shortDefinition?.includes(GLOSSARY_SHORTDEF_REPLACE)) {
    console.log('  · shortDefinition: already applied');
  } else {
    console.warn('  ⚠ shortDefinition: target string not found — skipping');
  }

  const fdBlock = itame.fullDefinition?.[0];
  const fdSpan = fdBlock?.children?.[0];
  if (fdSpan && typeof fdSpan.text === 'string') {
    if (fdSpan.text.includes(GLOSSARY_FULLDEF_FIND)) {
      fdSpan.text = fdSpan.text.replace(
        GLOSSARY_FULLDEF_FIND,
        GLOSSARY_FULLDEF_REPLACE,
      );
      glossaryChanged = true;
      console.log('  ✓ fullDefinition: detected in 7 tendons → seven patients');
    } else if (fdSpan.text.includes(GLOSSARY_FULLDEF_REPLACE)) {
      console.log('  · fullDefinition: already applied');
    } else {
      console.warn('  ⚠ fullDefinition: target string not found — skipping');
    }
  }

  if (glossaryChanged) {
    if (DRY_RUN) {
      console.log('  (dry-run: skipping glossary write)');
    } else {
      await client.createOrReplace({ ...itame });
      console.log('  ✓ glossary-itame written');
    }
  }

  console.log('\n✓ Flexor remediation complete.');
}

main().catch((err) => {
  console.error('\n✗ Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
