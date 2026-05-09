// site/scripts/audit-fix-extensor-remediation.ts
//
// Forensic-audit remediation for /en/blog/extensor-tendon-injuries
// (article-extensor-tendon-injuries). Source of authority:
// 01-brand-system/inbox/REMEDIATION-extensor-tendon.md.
//
// Decision 5A+A1 (2026-05-09): patch existing doyle-greens-2022 in place to
// 5th edition (2005), where Doyle is the actual chapter author.
//
// Audit §1.1 Newport author rendering, §1.2 BSSH corporate author rendering,
// and §1.3 Catalano author rendering are NOT addressed here — those are
// stored correctly; the malformed display is a Vancouver formatter renderer
// bug fixed in src/lib/citations.ts (companion change).
//
// Idempotent.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-extensor-remediation.ts
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-extensor-remediation.ts --dry-run

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

const ARTICLE_ID = 'article-extensor-tendon-injuries';

interface Span {
  _key: string;
  _type?: string;
  text?: string;
  marks?: string[];
}
interface MarkDef {
  _key: string;
  _type: string;
  reference?: { _ref: string; _type: string };
}
interface Block {
  _key: string;
  _type?: string;
  style?: string;
  children?: Span[];
  markDefs?: MarkDef[];
}

const span = (key: string, text: string, marks: string[] = []): Span => ({
  _key: key,
  _type: 'span',
  text,
  marks,
});

const citationMark = (key: string, refId: string): MarkDef => ({
  _key: key,
  _type: 'citation',
  reference: { _ref: refId, _type: 'reference' },
});

type Transformer = (block: Block) => boolean;

function simpleSpanText(
  blockKey: string,
  spanKey: string,
  find: string,
  replace: string,
): Transformer {
  return (block: Block): boolean => {
    if (block._key !== blockKey) return false;
    const sp = block.children?.find((s) => s._key === spanKey);
    if (!sp || typeof sp.text !== 'string') return false;
    if (sp.text.includes(replace) && !sp.text.includes(find)) return false;
    if (!sp.text.includes(find)) {
      console.warn(
        `    ⚠ ${blockKey}/${spanKey}: target string not found`,
      );
      return false;
    }
    sp.text = sp.text.replace(find, replace);
    return true;
  };
}

// §3.1 — Wehbé/Doyle classification: drop the conflated Wehbé Type I-III
// description, separate the two parallel schemes honestly, and add a
// citation on Doyle's classification mid-paragraph.
const transformWehbeDoyleSplit: Transformer = (block) => {
  if (block._key !== 'b9') return false;
  const newMarkKey = 'c-doyle-greens-2005';
  if (block.markDefs?.some((m) => m._key === newMarkKey)) return false;

  const s34 = block.children?.find((s) => s._key === 's34');
  const s35 = block.children?.find((s) => s._key === 's35');
  if (!s34 || !s35 || typeof s34.text !== 'string' || typeof s35.text !== 'string') return false;

  const s34Tail = '. The Wehbé and Schneider scheme';
  const s35Find =
    " distinguishes closed soft-tissue injury (Type I), open injury with disruption of tendon continuity (Type II) and open injury with skin and tendon substance loss (Type III), each subdivided by the presence or absence of joint subluxation when bony involvement is present; Doyle's Type IV adds the bony mallet variants. The single hard indication for surgery is volar subluxation of the distal phalanx — when the joint cannot be reduced congruently in the splint, the biomechanics no longer support tendon-to-bone or fragment-to-bone healing in any reasonable position";

  if (!s34.text.endsWith(s34Tail)) {
    console.warn('    ⚠ b9: s34 does not end with expected Wehbé scheme tail');
    return false;
  }
  if (!s35.text.startsWith(s35Find)) {
    console.warn('    ⚠ b9: s35 does not match expected description start');
    return false;
  }

  // Insert "Two classifications coexist in the literature. " into s34
  // immediately before "The Wehbé and Schneider scheme".
  s34.text = s34.text.replace(
    s34Tail,
    '. Two classifications coexist in the literature. The Wehbé and Schneider scheme',
  );

  // Replace s35 with 3 spans: re-described Wehbé+Doyle paragraph (no marks),
  // Doyle citation tail, lamaris-cited volar subluxation tail.
  const wehbeDescription =
    ", a bony-mallet-only system, distinguishes injury without DIP joint subluxation (Type I), injury with subluxation (Type II) and transphyseal paediatric injury (Type III), with subtypes A, B and C reflecting fragment size of less than one third, one third to two thirds, and more than two thirds of the articular surface respectively. Doyle's parallel scheme";
  const doyleClassification =
    ' classifies all mallet injuries: closed (Type I), open with tendon laceration (Type II), open with substance loss (Type III) and bony (Type IV, subdivided by mechanism and articular involvement).';
  const subluxationTail =
    ' The single hard indication for surgery is volar subluxation of the distal phalanx — when the joint cannot be reduced congruently in the splint, the biomechanics no longer support tendon-to-bone or fragment-to-bone healing in any reasonable position';

  const s35Idx = block.children!.findIndex((s) => s._key === 's35');
  block.children!.splice(
    s35Idx,
    1,
    // The Doyle citation marker hangs at the END of s35 ("...Doyle's parallel
    // scheme") because the renderer emits sup-markers AFTER the marked span.
    // This places ² right after "scheme" per the audit's recommended layout
    // (mid-sentence) rather than at the end of s35a after "...involvement)."
    span('s35', wehbeDescription, [newMarkKey]),
    span('s35a', doyleClassification, []),
    span('s35b', subluxationTail, ['c19']), // c19 already exists as lamaris-2017
  );
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(newMarkKey, 'doyle-greens-2022'),
    // _id stays the same; the doc itself is patched to 5th ed. 2005 below.
  ];
  return true;
};

const BODY_TRANSFORMS: Array<{
  id: string;
  description: string;
  transform: Transformer;
}> = [
  {
    id: '3.1',
    description:
      'Wehbé/Doyle: separate the two parallel schemes honestly + Doyle citation',
    transform: transformWehbeDoyleSplit,
  },
  {
    id: '3.2',
    description: 'Lamaris quote: applies to "complicated cases" not just fragment-size',
    transform: simpleSpanText(
      'b9',
      's38',
      'an advantage of surgery in fragment-size-defined cases',
      'an advantage of surgery in complicated cases — those defined either by fragment size or by volar subluxation —',
    ),
  },
  {
    id: '3.3',
    description: 'Aksan: 6.0° → 6° (source-faithful)',
    transform: simpleSpanText('b10', 's43', '6.0° after splinting alone', '6° after splinting alone'),
  },
  {
    id: '3.4',
    description: 'Catalano denominators: separate patient-level from digit-level',
    transform: simpleSpanText(
      'b18',
      's68',
      ' of eleven Rayan-Murray Type III injuries managed in a custom splint holding the affected MCP in twenty-five to thirty-five degrees of relative hyperextension produced eight of eleven pain-free, with seven of eleven showing no or barely discernible residual subluxation',
      ' of ten patients with eleven Rayan-Murray Type III injuries managed in a custom splint holding the affected MCP in twenty-five to thirty-five degrees of relative hyperextension produced eight of ten patients pain-free, with seven of eleven injuries showing no or barely discernible residual subluxation',
    ),
  },
  {
    id: '3.5',
    description: 'Newport: 64% applies to patients without associated injury, not digits',
    transform: simpleSpanText(
      'b22',
      's80',
      'Sixty-four per cent of digits without associated injury achieved good or excellent outcomes',
      'Sixty-four per cent of patients without associated injury achieved good or excellent outcomes',
    ),
  },
];

async function main() {
  console.log(
    `→ Extensor remediation${DRY_RUN ? ' (DRY RUN)' : ''}: 1 ref patch + ${BODY_TRANSFORMS.length} body patches\n`,
  );

  // ---- Stage 1: Doyle ref patch (5A+A1: 8th 2022 → 5th 2005) ----
  console.log('→ BibRef patch:');
  const doylePatch = {
    year: 2005,
    edition: '5th',
    editors: ['Green DP', 'Hotchkiss RN', 'Pederson WC', 'Wolfe SW'],
    publisher: 'Elsevier Churchill Livingstone',
    publisherLocation: 'Philadelphia',
  };
  if (DRY_RUN) {
    console.log(`  ✓ doyle-greens-2022: would set year/edition/editors/publisher/location`);
  } else {
    await client.patch('doyle-greens-2022').set(doylePatch).commit();
    console.log(
      '  ✓ doyle-greens-2022: 8th ed. 2022 → 5th ed. 2005, editors corrected, Philadelphia/Elsevier-Churchill-Livingstone',
    );
  }

  // ---- Stage 2: body patches ----
  console.log('\n→ Body patches:');
  // Fetch the full document so createOrReplace preserves _type and all
  // schema-required fields.
  const article = await client.fetch<({ _id: string; body: Block[] } & Record<string, unknown>) | null>(
    `*[_id == $id][0]`,
    { id: ARTICLE_ID },
  );
  if (!article) {
    console.error(`✗ Article ${ARTICLE_ID} not found.`);
    process.exit(1);
  }

  let bodyChanged = false;
  for (const t of BODY_TRANSFORMS) {
    let appliedToAny = false;
    for (const block of article.body) {
      if (t.transform(block)) {
        appliedToAny = true;
        bodyChanged = true;
      }
    }
    if (appliedToAny) {
      console.log(`  ✓ ${t.id}: ${t.description}`);
    } else {
      console.log(`  · ${t.id}: no change (already applied or target missing)`);
    }
  }

  if (bodyChanged) {
    if (DRY_RUN) {
      console.log('\n  (dry-run: skipping article write)');
    } else {
      await client.createOrReplace({ ...article });
      console.log('\n  ✓ article body written');
    }
  } else {
    console.log('\n  · no article body changes');
  }

  console.log('\n✓ Extensor remediation complete.');
}

main().catch((err) => {
  console.error('\n✗ Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
