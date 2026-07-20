// site/scripts/export-pl-content.ts
//
// One-shot exporter for the 2026-07 PL linguistic + citation audit.
// Dumps every Polish-language surface (articles, procedures, bilingual
// glossary) as human-readable text with block/span _keys inline, so the
// audit can propose surgical (blockKey / span-text) find/replace patches.
//
// Read-only. Writes per-document .txt files into a target dir.
//
// Usage (from site/):
//   source ~/.nvm/nvm.sh && nvm use 24
//   node --experimental-strip-types --env-file=.env.local scripts/export-pl-content.ts <outDir>

import { createClient } from '@sanity/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] || '/tmp/pl-export';
mkdirSync(OUT, { recursive: true });

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_EDITOR_TOKEN || process.env.SANITY_API_DEVELOPER_TOKEN || undefined,
  useCdn: false,
});

type Span = { _type?: string; _key?: string; text?: string; marks?: string[] };
type MarkDef = { _type?: string; _key?: string; [k: string]: unknown };
type Block = {
  _type?: string;
  _key?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: Span[];
  markDefs?: MarkDef[];
  content?: Block[]; // callouts nest here
  [k: string]: unknown;
};

function markLabel(marks: string[] | undefined, markDefs: MarkDef[] | undefined): string {
  if (!marks || marks.length === 0) return '-';
  const labels = marks.map((m) => {
    if (m === 'strong' || m === 'em' || m === 'underline' || m === 'strike-through') return m;
    const def = (markDefs || []).find((d) => d._key === m);
    if (!def) return m;
    if (def._type === 'citation') return 'CIT';
    if (def._type === 'glossaryTerm') return 'GLOSS';
    if (def._type === 'link') return 'link';
    return def._type || m;
  });
  return labels.join('+');
}

function renderBlocks(blocks: Block[] | undefined, indent = ''): string[] {
  if (!Array.isArray(blocks)) return [];
  const lines: string[] = [];
  for (const b of blocks) {
    if (b._type === 'block') {
      const tag = b.listItem ? `list:${b.listItem}` : b.style || 'normal';
      lines.push(`${indent}[block ${b._key} | ${tag}]`);
      for (const c of b.children || []) {
        if (typeof c.text !== 'string') continue;
        const ml = markLabel(c.marks, b.markDefs);
        lines.push(`${indent}  <${c._key} ${ml}> ${JSON.stringify(c.text)}`);
      }
    } else if (b._type === 'callout') {
      lines.push(`${indent}[callout ${b._key} | type=${(b as Record<string, unknown>).type ?? '?'} title=${JSON.stringify((b as Record<string, unknown>).title ?? '')}]`);
      lines.push(...renderBlocks((b.content as Block[]) || [], indent + '  '));
    } else if (b._type === 'image') {
      lines.push(`${indent}[image ${b._key} | caption=${JSON.stringify((b as Record<string, unknown>).caption ?? '')}]`);
    } else {
      lines.push(`${indent}[${b._type} ${b._key}]`);
    }
  }
  return lines;
}

function flatField(name: string, val: unknown): string[] {
  if (val == null || val === '') return [];
  return [`### FIELD ${name} (flat string)`, JSON.stringify(val), ''];
}

function ptField(name: string, val: unknown): string[] {
  if (!Array.isArray(val) || val.length === 0) return [];
  return [`### FIELD ${name} (portable text)`, ...renderBlocks(val as Block[]), ''];
}

async function main() {
  // ---- Articles ----
  const articles = await client.fetch<Block[]>(`*[_type=="article" && language=="pl"]{...}`);
  for (const a of articles as unknown as Record<string, unknown>[]) {
    const id = a._id as string;
    const out: string[] = [`# ${id} (article)`, `title: ${JSON.stringify(a.title)}`, `slug: ${JSON.stringify((a.slug as Record<string, unknown>)?.current)}`, ''];
    out.push(...flatField('title', a.title));
    out.push(...flatField('seoTitle', a.seoTitle));
    out.push(...flatField('excerpt', a.excerpt));
    out.push(...flatField('standfirst', a.standfirst));
    out.push(...flatField('seoDescription', a.seoDescription));
    const kp = a.keyPoints as Record<string, unknown> | undefined;
    if (kp) {
      out.push(...flatField('keyPoints.question', kp.question));
      out.push(...flatField('keyPoints.findings', kp.findings));
      out.push(...flatField('keyPoints.meaning', kp.meaning));
    }
    const faq = a.faq as Record<string, unknown>[] | undefined;
    if (Array.isArray(faq)) {
      out.push('### FIELD faq (array)');
      faq.forEach((f, i) => {
        out.push(`  [${i}] Q: ${JSON.stringify(f.question)}`);
        out.push(`      A: ${JSON.stringify(f.answer)}`);
      });
      out.push('');
    }
    out.push(...ptField('body', a.body));
    writeFileSync(join(OUT, `article-${(a.slug as Record<string, unknown>)?.current || id}.txt`), out.join('\n'));
  }

  // ---- Procedures ----
  const PROC_FIELDS = [
    'summary', 'indications', 'contraindications', 'anatomy', 'positioning',
    'approach', 'keySteps', 'closure', 'aftercare', 'complications', 'evidence', 'patientSummary',
  ];
  const procs = await client.fetch<Block[]>(`*[_type=="procedurePage" && language=="pl"]{...}`);
  for (const p of procs as unknown as Record<string, unknown>[]) {
    const id = p._id as string;
    const out: string[] = [`# ${id} (procedurePage)`, `title: ${JSON.stringify(p.title)}`, ''];
    out.push(...flatField('title', p.title));
    out.push(...flatField('seoTitle', p.seoTitle));
    out.push(...flatField('seoDescription', p.seoDescription));
    const kp = p.keyPoints as Record<string, unknown> | undefined;
    if (kp) {
      out.push(...flatField('keyPoints.question', kp.question));
      out.push(...flatField('keyPoints.findings', kp.findings));
      out.push(...flatField('keyPoints.meaning', kp.meaning));
    }
    for (const f of PROC_FIELDS) out.push(...ptField(f, p[f]));
    // keySteps may be array of objects with step content
    const ks = p.keySteps as Record<string, unknown>[] | undefined;
    if (Array.isArray(ks) && ks.length && ks[0] && ks[0]._type !== 'block') {
      out.push('### FIELD keySteps (structured steps)');
      ks.forEach((s, i) => {
        out.push(`  [step ${i} ${s._key}]`);
        out.push(...renderBlocks((s.content as Block[]) || (s.body as Block[]), '    '));
        if (s.pitfall) out.push(...renderBlocks(s.pitfall as Block[], '    pitfall> '));
      });
      out.push('');
    }
    const faq = p.faq as Record<string, unknown>[] | undefined;
    if (Array.isArray(faq)) {
      out.push('### FIELD faq (array)');
      faq.forEach((f, i) => {
        out.push(`  [${i}] Q: ${JSON.stringify(f.question)}`);
        out.push(`      A: ${JSON.stringify(f.answer)}`);
      });
      out.push('');
    }
    writeFileSync(join(OUT, `procedure-${(p.slug as Record<string, unknown>)?.current || id}.txt`), out.join('\n'));
  }

  // ---- Glossary (PL fields only) ----
  const gloss = await client.fetch<Block[]>(`*[_type=="glossaryTerm" && defined(termPolish)]|order(slug.current asc){...}`);
  const gOut: string[] = ['# GLOSSARY — PL fields', ''];
  for (const g of gloss as unknown as Record<string, unknown>[]) {
    gOut.push(`## ${g._id}  (term: ${JSON.stringify(g.term)})`);
    gOut.push(...flatField('termPolish', g.termPolish));
    gOut.push(...flatField('shortDefinitionPolish', g.shortDefinitionPolish));
    gOut.push(...ptField('fullDefinitionPolish', g.fullDefinitionPolish));
    gOut.push('');
  }
  writeFileSync(join(OUT, `glossary-pl.txt`), gOut.join('\n'));

  console.log(`Exported ${articles.length} articles, ${procs.length} procedures, ${gloss.length} glossary terms to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
