// site/scripts/update-glossary-pl-cts.ts
//
// Idempotent patch for the Polish CTS glossary update package
// (01-brand-system/inbox/drgladysz-glossary-pl-cts-procedure-v1_1.md).
//
// Reads the markdown source, extracts each `### \`{slug}\`` block with its
// termPolish / shortDefinitionPolish / synonyms fields, then patches the
// existing `glossary-{slug}` Sanity doc with the PL fields. Synonyms are
// merged with any existing array (PL synonyms add to EN synonyms; no
// duplication). Missing source docs are reported but not auto-created —
// the seed-cts-pl-procedure.ts script creates any new glossaryTerm docs
// referenced by the procedure body.
//
// Run from site/:
//   node --experimental-strip-types --env-file=.env.local scripts/update-glossary-pl-cts.ts

import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91';
const DATASET = process.env.PUBLIC_SANITY_DATASET || 'production';
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';

if (!TOKEN) {
  console.error('Missing SANITY_API_DEVELOPER_TOKEN or SANITY_API_WRITE_TOKEN.');
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-10-01',
  useCdn: false,
});

const SOURCE_PATH = resolve(
  __dirname,
  '../../01-brand-system/inbox/drgladysz-glossary-pl-cts-procedure-v1_1.md',
);

interface GlossaryEntry {
  slug: string;
  termPolish: string;
  shortDefinitionPolish: string;
  synonymsPolish: string[];
}

function parseGlossary(): GlossaryEntry[] {
  const md = readFileSync(SOURCE_PATH, 'utf8');
  // Skip the change-log tables at the top — they contain rows like
  //   | `slug` | `value` |
  // which would falsely match a `\`slug\`` capture if we weren't anchored.
  // Real entries always start the line with `### ` followed by a slug in
  // backticks, then the four bullet lines below.
  const blockPattern =
    /^###\s+`([a-z0-9-]+)`\s*\n((?:- \*\*[^\n]+\n?)+)/gm;
  const out: GlossaryEntry[] = [];
  for (const match of md.matchAll(blockPattern)) {
    const slug = match[1];
    const body = match[2];
    const termPolish = extractField(body, 'termPolish');
    const shortDefinitionPolish = extractField(body, 'shortDefinitionPolish');
    const synonymsRaw = extractField(body, 'synonyms');
    if (!termPolish || !shortDefinitionPolish) continue;
    const synonymsPolish =
      synonymsRaw === '—' || !synonymsRaw
        ? []
        : synonymsRaw
            .split(/[|,]/)
            .map((s) => s.trim())
            // Drop italic markers around Latin terms so the tag stays clean
            .map((s) => s.replace(/^\*(.+)\*$/, '$1'))
            .filter(Boolean);
    out.push({
      slug,
      termPolish,
      shortDefinitionPolish,
      synonymsPolish,
    });
  }
  return out;
}

function extractField(body: string, name: string): string | null {
  const re = new RegExp(`- \\*\\*${name}:\\*\\* ([^\\n]+)`);
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

async function main() {
  const entries = parseGlossary();
  console.log(`Parsed ${entries.length} glossary entries from inbox file.`);

  const ids = entries.map((e) => `glossary-${e.slug}`);
  const existing = await client.fetch<{ _id: string; synonyms?: string[] }[]>(
    `*[_type == "glossaryTerm" && _id in $ids]{_id, synonyms}`,
    { ids },
  );
  const existingMap = new Map(existing.map((d) => [d._id, d]));

  let patched = 0;
  const missing: string[] = [];
  for (const entry of entries) {
    const id = `glossary-${entry.slug}`;
    const doc = existingMap.get(id);
    if (!doc) {
      missing.push(entry.slug);
      continue;
    }
    // Merge PL synonyms with whatever's there (de-duplicated, original order
    // preserved). The schema's `synonyms` field is a single tag-array; EN
    // and PL synonyms coexist in it.
    const mergedSynonyms = uniqueOrdered([
      ...(doc.synonyms ?? []),
      ...entry.synonymsPolish,
    ]);

    await client
      .patch(id)
      .set({
        termPolish: entry.termPolish,
        shortDefinitionPolish: entry.shortDefinitionPolish,
        ...(entry.synonymsPolish.length > 0 ? { synonyms: mergedSynonyms } : {}),
      })
      .commit();
    patched++;
    console.log(`  ✓ ${entry.slug}`);
  }

  console.log('');
  console.log(
    `Done. ${patched} glossary docs patched, ${missing.length} missing.`,
  );
  if (missing.length > 0) {
    console.log(
      `Missing slugs (will be created by seed-cts-pl-procedure when those marks are resolved):`,
    );
    for (const slug of missing) console.log(`  · ${slug}`);
  }
}

function uniqueOrdered(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
