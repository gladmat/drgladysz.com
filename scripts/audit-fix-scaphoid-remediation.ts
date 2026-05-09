// site/scripts/audit-fix-scaphoid-remediation.ts
//
// Forensic-audit remediation for /en/blog/scaphoid-fractures
// (article-scaphoid-fractures). Source of authority:
// 01-brand-system/inbox/REMEDIATION-CLAUDE-CODE-scaphoid-fractures.md.
//
// Decision 4B (2026-05-09): retain Herbert B5 by creating a textbook bibRef
// for the 1990 Herbert monograph.
//
// Phase 1 PMID verification corrected 4 of the 7 audit-claimed PMIDs (the
// audit author had transcription errors); the corrected map is hard-coded
// here. Verified via PubMed get_article_metadata before this script was run.
//
//   Watson HK, Ryu J 1986        : 3955970   (audit had 3534284)
//   Slade JF, Gutow AP, Geissler 2002 : 12479336  (audit had 12782852)
//   Mallee WH 2014               : 25091335  (audit had 25129198)
//   Filan SL, Herbert TJ 1996    : 8682813   (audit had 8682811)
//   Johnson NA 2026 SWIFFT lig.  : 41916572  ✓ verified
//   Watson HK, Ballet FL 1984    : 6725894   ✓ verified
//   Karimnazhand R 2025          : 40678609  ✓ verified
//
// Idempotent. Two-stage write: bibRefs first (creates+patches), then article
// body patches that depend on the new bibRef _ids existing.
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-scaphoid-remediation.ts
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-scaphoid-remediation.ts --dry-run

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

const ARTICLE_ID = 'article-scaphoid-fractures';

// Slug-form _id convention. Matches existing project bibRefs.
const NEW_BIBREFS: Record<string, Record<string, unknown>> = {
  'johnson-2026-swifft-ligament': {
    _id: 'johnson-2026-swifft-ligament',
    _type: 'bibReference',
    title:
      'Scaphoid fractures and associated ligament injury: five-year follow-up of the SWIFFT trial',
    authors: [
      'Johnson NA',
      'Francis R',
      'Choudhary S',
      'Jeyapalan K',
      'Dias JJ',
    ],
    journal: 'Bone Joint J',
    year: 2026,
    volume: '108-B',
    issue: '4',
    pages: '538-543',
    pmid: '41916572',
    doi: '10.1302/0301-620X.108B4.BJJ-2025-0876.R1',
    pubType: 'journal',
  },
  'watson-ballet-1984': {
    _id: 'watson-ballet-1984',
    _type: 'bibReference',
    title:
      'The SLAC wrist: scapholunate advanced collapse pattern of degenerative arthritis',
    authors: ['Watson HK', 'Ballet FL'],
    journal: 'J Hand Surg Am',
    year: 1984,
    volume: '9',
    issue: '3',
    pages: '358-65',
    pmid: '6725894',
    doi: '10.1016/s0363-5023(84)80223-3',
    pubType: 'journal',
  },
  'watson-ryu-1986': {
    _id: 'watson-ryu-1986',
    _type: 'bibReference',
    title: 'Evolution of arthritis of the wrist',
    authors: ['Watson HK', 'Ryu J'],
    journal: 'Clin Orthop Relat Res',
    year: 1986,
    issue: '202',
    pages: '57-67',
    pmid: '3955970',
    pubType: 'journal',
  },
  'slade-2002': {
    _id: 'slade-2002',
    _type: 'bibReference',
    title:
      'Percutaneous internal fixation of scaphoid fractures via an arthroscopically assisted dorsal approach',
    authors: ['Slade JF', 'Gutow AP', 'Geissler WB'],
    journal: 'J Bone Joint Surg Am',
    year: 2002,
    volume: '84-A Suppl 2',
    pages: '21-36',
    pmid: '12479336',
    doi: '10.2106/00004623-200200002-00003',
    pubType: 'journal',
  },
  'mallee-2014': {
    _id: 'mallee-2014',
    _type: 'bibReference',
    title:
      'Clinical diagnostic evaluation for scaphoid fractures: a systematic review and meta-analysis',
    authors: [
      'Mallee WH',
      'Henny EP',
      'van Dijk CN',
      'Kamminga SP',      // 4-author Dutch Cochrane Center cohort + Kloen
      'van Enst WA',
      'Kloen P',
    ],
    journal: 'J Hand Surg Am',
    year: 2014,
    volume: '39',
    issue: '9',
    pages: '1683-1691.e2',
    pmid: '25091335',
    doi: '10.1016/j.jhsa.2014.06.004',
    pubType: 'journal',
  },
  'filan-herbert-1996': {
    _id: 'filan-herbert-1996',
    _type: 'bibReference',
    title: 'Herbert screw fixation of scaphoid fractures',
    authors: ['Filan SL', 'Herbert TJ'],
    journal: 'J Bone Joint Surg Br',
    year: 1996,
    volume: '78',
    issue: '4',
    pages: '519-29',
    pmid: '8682813',
    pubType: 'journal',
  },
  'herbert-1990-fractured-scaphoid': {
    _id: 'herbert-1990-fractured-scaphoid',
    _type: 'bibReference',
    title: 'The Fractured Scaphoid',
    authors: ['Herbert TJ'],
    journal: 'The Fractured Scaphoid',
    year: 1990,
    publisher: 'Quality Medical Publishing',
    publisherLocation: 'St Louis',
    pubType: 'book',
  },
};

interface RefPatch {
  id: string;
  set: Record<string, unknown>;
  description: string;
}

const REF_PATCHES: RefPatch[] = [
  {
    id: 'sahu-2023',
    set: { year: 2022 },
    description: 'Sahu year 2023 → 2022 (epub 2021-12-17, audit §2.1)',
  },
  {
    id: 'siotos-meta-2022',
    set: { year: 2022 },
    description: 'Siotos year 2023 → 2022 (epub 2022-01-17, audit §2.2)',
  },
  {
    id: 'karimnazhand-meta-2025',
    set: {
      pmid: '40678609',
      volume: '53',
      pages: '231-245',
      doi: '10.1016/j.jot.2025.06.009',
      // Replace stored authors[] (which had 6 real + literal "et al." sentinel)
      // with the full 8-author PubMed list. Renderer applies ICMJE truncation.
      authors: [
        'Karimnazhand R',
        'Shams R',
        'Behmanesh A',
        'Vosough M',
        'Gharooee Ahangar A',
        'Serrano Barrenechea L',
        'Mahmoudinasab O',
        'Najd Mazhar F',
      ],
    },
    description:
      'Karimnazhand metadata fill (PMID, volume, pages, DOI) + drop "et al." sentinel + add 2 missing authors (audit §2.3)',
  },
];

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

// ---------------------------------------------------------------------------
// Body-block transformers. Each transformer mutates the block in place and
// returns true if a change was made. Idempotent — re-runs are no-ops.
// ---------------------------------------------------------------------------

type Transformer = (block: Block) => boolean;

function simpleSpanText(
  spanKey: string,
  find: string,
  replace: string,
): Transformer {
  return (block: Block): boolean => {
    const sp = block.children?.find((s) => s._key === spanKey);
    if (!sp || typeof sp.text !== 'string') return false;
    if (sp.text.includes(replace) && !sp.text.includes(find)) return false; // already applied
    if (!sp.text.includes(find)) {
      console.warn(
        `    ⚠ span ${block._key}/${spanKey}: target string not found`,
      );
      return false;
    }
    sp.text = sp.text.replace(find, replace);
    return true;
  };
}

// §3.2 — AVN proximal fifth: rewrite second sentence + insert filan-herbert
// citation BEFORE existing gelberman-menon citation.
const transformAvnProximal: Transformer = (block) => {
  if (block._key !== 'b29') return false;
  const newMarkKey = 'c-filan-1996';
  if (block.markDefs?.some((m) => m._key === newMarkKey)) return false;

  const oldS84 = block.children?.find((s) => s._key === 's84');
  if (!oldS84 || !oldS84.text) return false;

  const oldText = oldS84.text;
  const findFragment =
    'The risk approaches 100% in fractures isolating the proximal fifth, where the dorsal ridge supply is interrupted';
  const newFragment =
    'The risk approaches 100% in fractures isolating the proximal fifth, an observation derived from clinical series of proximal pole non-unions consistent with the dorsal ridge vascular anatomy described by Gelberman and Menon';
  if (!oldText.includes(findFragment)) {
    console.warn('    ⚠ b29: AVN sentence not found');
    return false;
  }
  const newText = oldText.replace(findFragment, newFragment);

  // Restructure: s84 carries new filan citation; new comma-separator span
  // carries existing gelberman c49; s85 unchanged.
  block.children = [
    span('s84', newText, [newMarkKey]),
    span('s84b', ',', ['c49']),
    ...(block.children?.filter((s) => s._key !== 's84') ?? []),
  ];
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(newMarkKey, 'filan-herbert-1996'),
  ];
  return true;
};

// §3.3 — Herbert classification (Decision 4B keeps B5): drop "Herbert and"
// from the system name, reword B5 to "with B5 (comminuted) added in
// Herbert's 1990 monograph", append herbert-1990 monograph citation.
const transformHerbertB5: Transformer = (block) => {
  if (block._key !== 'b9') return false;
  const newMarkKey = 'c-herbert-monograph-1990';
  if (block.markDefs?.some((m) => m._key === newMarkKey)) return false;

  const s30 = block.children?.find((s) => s._key === 's30');
  if (!s30 || !s30.text) return false;

  const findFragment =
    'is the Herbert and Herbert–Fisher classification, which incorporates location, stability and chronicity (Type A: stable acute; B: unstable acute, including B1 distal oblique, B2 displaced waist, B3 proximal pole, B4 trans-scaphoid perilunate, B5 comminuted; C: delayed union; D: established non-union)';
  const newFragment =
    "is the Herbert classification, which incorporates location, stability and chronicity (Type A: stable acute; B: unstable acute, including B1 distal oblique, B2 displaced waist, B3 proximal pole, B4 trans-scaphoid perilunate, with B5 (comminuted) added in Herbert's 1990 monograph; C: delayed union; D: established non-union)";
  if (!s30.text.includes(findFragment)) {
    console.warn('    ⚠ b9: Herbert classification fragment not found');
    return false;
  }
  s30.text = s30.text.replace(findFragment, newFragment);

  // Append separator-with-monograph-citation between s30 and s31.
  const s30Idx = block.children!.findIndex((s) => s._key === 's30');
  block.children!.splice(s30Idx + 1, 0, span('s30b', ',', [newMarkKey]));
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(newMarkKey, 'herbert-1990-fractured-scaphoid'),
  ];
  return true;
};

// §3.4 — SWIFFT ligament substudy: rewrite trailing sentence in s90 + insert
// johnson-2026 citation. The current s90 holds " injuries (Herbert B4) in
// specialist centres. SWIFFT's secondary analysis...inconsequential."
const transformSwifftLigament: Transformer = (block) => {
  if (block._key !== 'b32') return false;
  const newMarkKey = 'c-johnson-swifft-2026';
  if (block.markDefs?.some((m) => m._key === newMarkKey)) return false;

  const s90 = block.children?.find((s) => s._key === 's90');
  if (!s90 || !s90.text) return false;

  const findFragment =
    "SWIFFT's secondary analysis of associated ligament injury reported scapholunate gap widening of more than 3 mm on initial imaging in only 2.8% of the trial population, with no progression at five years — reassurance that occult ligament injury in the minimally displaced waist fracture population is uncommon and clinically inconsequential.";
  const newPrefix = ' injuries (Herbert B4) in specialist centres. ';
  const newCited =
    'The SWIFFT ligament substudy (Johnson and colleagues, 2026) reported scapholunate gap widening of more than 3 mm on initial imaging in only 2.8% of the trial population, with no progression at five years — reassurance that occult ligament injury in the minimally displaced waist fracture population is uncommon and clinically inconsequential';

  if (!s90.text.includes(findFragment)) {
    console.warn('    ⚠ b32: SWIFFT ligament fragment not found');
    return false;
  }
  // Replace s90 with three children: prefix (no marks), cited body, period.
  const s90Idx = block.children!.findIndex((s) => s._key === 's90');
  block.children!.splice(
    s90Idx,
    1,
    span('s90', newPrefix, []),
    span('s90b', newCited, [newMarkKey]),
    span('s90c', '.', []),
  );
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(newMarkKey, 'johnson-2026-swifft-ligament'),
  ];
  return true;
};

// §3.5 — SNAC staging: split s115 to attach watson-ballet-1984 + watson-ryu-1986.
const transformSnacStaging: Transformer = (block) => {
  if (block._key !== 'b40') return false;
  const ballet = 'c-watson-ballet-1984';
  const ryu = 'c-watson-ryu-1986';
  if (block.markDefs?.some((m) => m._key === ballet)) return false;

  const s115 = block.children?.find((s) => s._key === 's115');
  if (!s115 || !s115.text) return false;

  const stageDescription =
    "Untreated scaphoid non-union progresses through Watson's three-stage SNAC pattern: stage I — radial styloid arthrosis, with intact midcarpal joints; stage II — extension to the scaphocapitate articulation; stage III — periscapholunate arthrosis with extension to the capitolunate joint";
  const tail =
    '. The lunate–radius articulation is preserved until late, which is the anatomical basis for the most commonly used salvage options. Each stage is identifiable on plain radiographs supplemented by CT for cartilage assessment; MRI is rarely required for staging decisions but contributes when proximal-fragment viability is in question and motion-preserving reconstruction is being considered.';

  if (!s115.text.startsWith(stageDescription)) {
    console.warn('    ⚠ b40: SNAC stage description not found at start of s115');
    return false;
  }

  const s115Idx = block.children!.findIndex((s) => s._key === 's115');
  block.children!.splice(
    s115Idx,
    1,
    span('s115', stageDescription, [ballet]),
    span('s115b', ',', [ryu]),
    span('s115c', tail, []),
  );
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(ballet, 'watson-ballet-1984'),
    citationMark(ryu, 'watson-ryu-1986'),
  ];
  return true;
};

// §3.6 — Slade arthroscopic-assisted: insert citation marker between
// "technique" and " offers" inside s87.
const transformSladeCitation: Transformer = (block) => {
  if (block._key !== 'b31') return false;
  const newMarkKey = 'c-slade-2002';
  if (block.markDefs?.some((m) => m._key === newMarkKey)) return false;

  const s87 = block.children?.find((s) => s._key === 's87');
  if (!s87 || !s87.text) return false;

  const splitMarker =
    'The Slade arthroscopic-assisted percutaneous technique offers an intermediate option';
  if (!s87.text.includes(splitMarker)) {
    console.warn('    ⚠ b31: Slade technique sentence not found');
    return false;
  }

  // Split s87 at "technique" / " offers". Pre-citation prefix + cited
  // "...technique" + post-citation tail.
  const splitAt = s87.text.indexOf(splitMarker);
  const beforeTech = s87.text.slice(
    0,
    splitAt + 'The Slade arthroscopic-assisted percutaneous technique'.length,
  );
  const afterTech = s87.text.slice(
    splitAt + 'The Slade arthroscopic-assisted percutaneous technique'.length,
  );

  const s87Idx = block.children!.findIndex((s) => s._key === 's87');
  block.children!.splice(
    s87Idx,
    1,
    span('s87', beforeTech, [newMarkKey]),
    span('s87b', afterTech, []),
  );
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(newMarkKey, 'slade-2002'),
  ];
  return true;
};

// §3.7 — Mallee meta-analysis: rewrite "Used in isolation" → "The Mallee
// meta-analysis confirmed that each sign in isolation", insert ³⁵ marker
// after "rises sharply".
const transformMalleeCitation: Transformer = (block) => {
  if (block._key !== 'b13') return false;
  const newMarkKey = 'c-mallee-2014';
  if (block.markDefs?.some((m) => m._key === newMarkKey)) return false;

  const s42 = block.children?.find((s) => s._key === 's42');
  if (!s42 || !s42.text) return false;

  const findFragment =
    ', scaphoid tubercle tenderness, and pain on axial compression of the thumb are the traditional clinical triad. Used in isolation each is sensitive but non-specific; in combination, and at sequential examinations, their predictive value rises sharply. Duckworth and colleagues prospectively examined 223 patients with suspected scaphoid injury and identified four independent predictors of true fracture: male sex, sports mechanism, snuffbox pain on ulnar deviation within 72 hours, and tubercle tenderness at two weeks';

  if (!s42.text.startsWith(findFragment)) {
    console.warn('    ⚠ b13: Mallee fragment not found at start of s42');
    return false;
  }

  // Split into 3 spans: cited preamble (mallee), period separator, original
  // duckworth-cited tail.
  const malleeText =
    ', scaphoid tubercle tenderness, and pain on axial compression of the thumb are the traditional clinical triad. The Mallee meta-analysis confirmed that each sign in isolation is sensitive but non-specific; in combination, and at sequential examinations, their predictive value rises sharply';
  const duckworthText =
    'Duckworth and colleagues prospectively examined 223 patients with suspected scaphoid injury and identified four independent predictors of true fracture: male sex, sports mechanism, snuffbox pain on ulnar deviation within 72 hours, and tubercle tenderness at two weeks';

  const s42Idx = block.children!.findIndex((s) => s._key === 's42');
  block.children!.splice(
    s42Idx,
    1,
    span('s42', malleeText, [newMarkKey]),
    span('s42b', '. ', []),
    span('s42c', duckworthText, ['c25']),
  );
  block.markDefs = [
    ...(block.markDefs ?? []),
    citationMark(newMarkKey, 'mallee-2014'),
  ];
  return true;
};

// §3.12 — 60-70%: replace "modern defined-population studies favour 60–70%" +
// "," in s11+s12 with "defined-population work from Bergen reported
// approximately 60%" referencing hove-1999 (existing c8 markDef in this
// block). Drop s12 entirely.
const transformBergen60Pc: Transformer = (block) => {
  if (block._key !== 'b3') return false;

  const s11 = block.children?.find((s) => s._key === 's11');
  const s12 = block.children?.find((s) => s._key === 's12');
  if (!s11 || !s11.text) return false;

  const findFragment =
    "; modern defined-population studies favour 60–70%";
  const newFragment =
    '; defined-population work from Bergen reported approximately 60%';

  if (s11.text.includes(newFragment) && !s11.text.includes(findFragment)) {
    return false; // already applied
  }
  if (!s11.text.includes(findFragment)) {
    console.warn('    ⚠ b3: 60-70% fragment not found in s11');
    return false;
  }

  s11.text = s11.text.replace(findFragment, newFragment);
  s11.marks = ['c8']; // re-point from c9 (duckworth) to c8 (hove-1999, already in markDefs)

  // Remove s12 (the comma-separator that carried the second citation).
  if (s12) {
    block.children = block.children!.filter((s) => s._key !== 's12');
  }
  return true;
};

const BODY_TRANSFORMS: Array<{
  id: string;
  description: string;
  transform: Transformer;
}> = [
  // Text-only patches
  {
    id: '3.1',
    description: 'Hove incidence unit error: 4.3 per 100k → 43 per 100k',
    transform: simpleSpanText(
      's10',
      'Earlier Scandinavian work from Bergen reported 4.3 per 100,000',
      'Earlier Scandinavian work from Bergen reported an annual incidence of 43 per 100,000 (4.3 per 10,000 in the original report)',
    ),
  },
  // Citation-insertion patches
  { id: '3.2', description: 'AVN proximal fifth → +Filan-Herbert', transform: transformAvnProximal },
  { id: '3.3', description: 'Herbert classification → +1990 monograph (Decision 4B)', transform: transformHerbertB5 },
  { id: '3.4', description: 'SWIFFT ligament substudy → +Johnson 2026', transform: transformSwifftLigament },
  { id: '3.5', description: 'SNAC staging → +Watson-Ballet 1984 +Watson-Ryu 1986', transform: transformSnacStaging },
  { id: '3.6', description: 'Slade percutaneous technique → +Slade 2002', transform: transformSladeCitation },
  { id: '3.7', description: 'Clinical triad → +Mallee 2014', transform: transformMalleeCitation },
  // Text-only patches
  {
    id: '3.8',
    description: 'NICE NG38 wording: "recommends" → "advises ... to consider"',
    transform: simpleSpanText(
      's46',
      'NICE NG38 recommends MRI as first-line imaging',
      'NICE NG38 advises clinicians to consider MRI as first-line imaging',
    ),
  },
  {
    id: '3.9',
    description: 'Hinde 1606: clarify lifetime cost vs annual saving',
    transform: simpleSpanText(
      's64',
      'with a mean lifetime saving of approximately £1,606 per eligible patient',
      'with a mean cost to the health system £1,606 lower per eligible patient over the lifetime decision model and a modelled annual saving of approximately £7.5 million',
    ),
  },
  {
    id: '3.10',
    description: '52.4% OA denominator: clarify "with five-year imaging"',
    transform: simpleSpanText(
      's63',
      '(52.4% had osteoarthritis in at least one peri-scaphoid joint at five years)',
      '(52.4% of patients with five-year imaging had osteoarthritis in at least one peri-scaphoid joint)',
    ),
  },
  {
    id: '3.11',
    description: 'Edinburgh B2: approximately one-third → 36% (n=55)',
    transform: simpleSpanText(
      's16',
      ' B2 (complete waist) injuries in approximately one-third',
      ' B2 (complete waist) injuries in 36% (n=55)',
    ),
  },
  { id: '3.12', description: '60-70% denominator → Bergen ~60% (drop garala)', transform: transformBergen60Pc },
  {
    id: '3.13',
    description: 'Ruby denominator: clarify 32 of 55 followed five years',
    transform: simpleSpanText(
      's99',
      "Ruby, Stinson and Belsky's parallel study found that 31 of 32 patients (97%) at five years or more from injury had developed wrist osteoarthritis, with the single exception having concomitant AVN",
      "Ruby, Stinson and Belsky's parallel study of 55 patients with scaphoid non-union found that, among the 32 followed for five years or more from injury, 31 (97%) had developed wrist osteoarthritis, with the single exception having concomitant AVN",
    ),
  },
  {
    id: '3.14',
    description: 'Chen 2023: surgery superior in grip + ROM, not "no effect"',
    transform: simpleSpanText(
      's68',
      'concluded that surgery shortens healing time and accelerates return to work and grip recovery without affecting non-union rate or long-term function',
      'concluded that surgery shortens healing time, accelerates return to work and improves grip strength and range of motion at follow-up, without affecting non-union or complication rates',
    ),
  },
  {
    id: '3.15',
    description: 'HR-pQCT: kappa 0.91 → 91% agreement (95% CI 0.76–1.00)',
    transform: simpleSpanText(
      's37',
      'interobserver kappa of approximately 0.91 for scaphoid fracture detection but availability',
      '91% interobserver agreement (95% CI 0.76–1.00) for scaphoid fracture detection, but availability',
    ),
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `→ Scaphoid remediation${DRY_RUN ? ' (DRY RUN)' : ''}: ${Object.keys(NEW_BIBREFS).length} new bibRefs + ${REF_PATCHES.length} ref patches + ${BODY_TRANSFORMS.length} body patches\n`,
  );

  // ---- Stage 1: create new bibRefs ----
  console.log('→ New bibRefs:');
  for (const [id, doc] of Object.entries(NEW_BIBREFS)) {
    const exists = await client.fetch<{ _id: string } | null>(
      `*[_id == $id][0]{_id}`,
      { id },
    );
    if (exists) {
      console.log(`  · ${id}: already exists`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  ✓ ${id}: would create`);
    } else {
      await client.createOrReplace(doc as never);
      console.log(`  ✓ ${id}: created`);
    }
  }

  // ---- Stage 2: patch existing bibRefs ----
  console.log('\n→ BibRef patches:');
  for (const patch of REF_PATCHES) {
    if (DRY_RUN) {
      console.log(`  ✓ ${patch.id}: would set ${Object.keys(patch.set).join(', ')} (${patch.description})`);
    } else {
      await client.patch(patch.id).set(patch.set).commit();
      console.log(`  ✓ ${patch.id}: ${patch.description}`);
    }
  }

  // ---- Stage 3: article body patches ----
  console.log('\n→ Body patches:');
  // Fetch the full document so createOrReplace preserves _type and all
  // schema-required fields (title, slug, standfirst, language, ...).
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

  console.log('\n✓ Scaphoid remediation complete.');
}

main().catch((err) => {
  console.error('\n✗ Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
