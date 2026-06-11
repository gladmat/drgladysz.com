// site/scripts/audit-fix-callout-titles.ts
//
// Audit fix (2026-06-11): content-structural.md F5 — callouts that open with a
// strong-marked lead word/phrase but carry title:null. The callout convention
// (memory feedback_callout_schema_fields) is to promote that lead phrase to the
// `title` field so it renders as an authored mono-cap header, and to REMOVE the
// strong lead span from the content so it does not render twice.
//
// Targets (callout `_key`s within the doc's PT array):
//   article-dupuytrens-disease-fessh-prep            body[]        cb1..cb11  lead "Examination notes." → title "Examination notes"
//   article-choroba-dupuytrena-leczenie-operacyjne   body[]        cb1, cb2   lead "Wskazówka praktyczna" → title "Wskazówka praktyczna"
//   procedure-percutaneous-needle-fasciotomy         indications[] cb1        lead "Note on collagenase." → title "Note on collagenase"
//     (cb2 in the same procedure already has a title — not touched.)
//
// Mechanism (verified against actual span layout via GROQ):
//   Each callout's first content block opens with a span whose marks==["strong"]
//   and whose text is exactly the lead phrase. The NEXT span begins with a single
//   leading space (" ...") and may itself carry citation marks (procedure cb1's
//   s58 carries c17/c18). We:
//     1. set callout.title = lead phrase with any trailing "." stripped
//     2. delete the strong lead span
//     3. strip exactly one leading space from the now-first span (preserving its marks)
//   All other spans/marks/markDefs are preserved untouched.
//
// Idempotent: a callout whose first span is no longer the strong lead phrase
// (i.e. already fixed) is reported as a no-op and skipped.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-callout-titles.ts           # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-callout-titles.ts --commit  # apply

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

type Span = { _key?: string; _type?: string; text?: string; marks?: string[]; [k: string]: unknown };
type Block = { _key?: string; _type?: string; children?: Span[]; [k: string]: unknown };
type Callout = { _key?: string; _type?: string; title?: string | null; content?: Block[]; [k: string]: unknown };

type Target = {
  id: string;
  field: string; // PT array field holding the callouts (body / indications / ...)
  calloutKeys: string[];
  leadText: string; // exact strong-span text, e.g. "Examination notes."
};

const TARGETS: Target[] = [
  {
    id: 'article-dupuytrens-disease-fessh-prep',
    field: 'body',
    calloutKeys: ['cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6', 'cb7', 'cb8', 'cb9', 'cb10', 'cb11'],
    leadText: 'Examination notes.',
  },
  {
    id: 'article-choroba-dupuytrena-leczenie-operacyjne',
    field: 'body',
    calloutKeys: ['cb1', 'cb2'],
    leadText: 'Wskazówka praktyczna',
  },
  {
    id: 'procedure-percutaneous-needle-fasciotomy',
    field: 'indications',
    calloutKeys: ['cb1'],
    leadText: 'Note on collagenase.',
  },
];

// title = lead phrase with a single trailing "." removed (so "Examination notes."
// → "Examination notes"; "Wskazówka praktyczna" stays unchanged).
function titleFromLead(lead: string): string {
  return lead.replace(/\.\s*$/, '').trimEnd();
}

type Outcome = 'fixed' | 'noop' | 'skip';

function fixCallout(callout: Callout, leadText: string): { outcome: Outcome; reason?: string; title?: string } {
  const expectedTitle = titleFromLead(leadText);
  const blocks = callout.content;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { outcome: 'skip', reason: 'no content blocks' };
  }
  const firstBlock = blocks[0];
  const children = firstBlock?.children;
  if (!Array.isArray(children) || children.length === 0) {
    return { outcome: 'skip', reason: 'first block has no spans' };
  }
  const lead = children[0];
  const isStrongLead =
    typeof lead.text === 'string' &&
    lead.text === leadText &&
    Array.isArray(lead.marks) &&
    lead.marks.includes('strong');

  if (!isStrongLead) {
    // No strong lead span: either already fixed (title set, lead span gone) or
    // an unexpected shape. Treat a matching title as an idempotent no-op.
    if (callout.title === expectedTitle) return { outcome: 'noop' };
    return { outcome: 'skip', reason: `first span is not the strong lead "${leadText}" (text=${JSON.stringify(lead.text)}, marks=${JSON.stringify(lead.marks)})` };
  }
  if (children.length < 2) {
    return { outcome: 'skip', reason: 'strong lead present but first block has only the lead span (no following text to keep)' };
  }

  // 1. compute title
  const title = titleFromLead(leadText);
  // 2. drop the strong lead span; 3. strip one leading space from the new first span
  const rest = children.slice(1).map((s, i) => {
    if (i === 0 && typeof s.text === 'string' && s.text.startsWith(' ')) {
      return { ...s, text: s.text.slice(1) };
    }
    return s;
  });
  const newFirstBlock: Block = { ...firstBlock, children: rest };
  callout.title = title;
  callout.content = [newFirstBlock, ...blocks.slice(1)];
  return { outcome: 'fixed', title };
}

async function main() {
  console.log(`audit-fix-callout-titles — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  let fixedTotal = 0;
  let noopTotal = 0;
  let skipTotal = 0;

  for (const target of TARGETS) {
    const doc = await client.fetch<{ _id: string; value: unknown } | null>(
      `*[_id == $id][0]{_id, "value": ${target.field}}`,
      { id: target.id },
    );
    if (!doc || !Array.isArray(doc.value)) {
      console.log(`  ✗ ${target.id}.${target.field} — not found or not an array; skipping doc`);
      skipTotal += target.calloutKeys.length;
      continue;
    }
    const arr = doc.value as (Block | Callout)[];
    console.log(`  ${target.id}.${target.field} (lead "${target.leadText}")`);

    let docChanged = false;
    for (const key of target.calloutKeys) {
      const node = arr.find((n) => n._key === key && n._type === 'callout') as Callout | undefined;
      if (!node) {
        console.log(`      ✗ ${key} — callout not found; skipping`);
        skipTotal++;
        continue;
      }
      const before = node.title ?? null;
      const res = fixCallout(node, target.leadText);
      if (res.outcome === 'fixed') {
        console.log(`      · ${key}: title ${JSON.stringify(before)} → ${JSON.stringify(res.title)}; strong lead span removed + leading space stripped`);
        fixedTotal++;
        docChanged = true;
      } else if (res.outcome === 'noop') {
        console.log(`      = ${key}: already fixed (title=${JSON.stringify(node.title)}); no-op`);
        noopTotal++;
      } else {
        console.log(`      ✗ ${key}: SKIP — ${res.reason}`);
        skipTotal++;
      }
    }

    if (COMMIT && docChanged) {
      await client.patch(target.id).set({ [target.field]: arr }).commit();
      console.log(`      ✓ committed ${target.id}.${target.field}`);
    }
  }

  console.log(`\n  Summary: ${fixedTotal} fixed, ${noopTotal} already-fixed, ${skipTotal} skipped.`);
  if (!COMMIT) console.log('  (dry-run — re-run with --commit to apply)');
  if (skipTotal > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
