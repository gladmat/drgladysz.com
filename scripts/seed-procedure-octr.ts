// site/scripts/seed-procedure-octr.ts
//
// One-shot importer for the open-carpal-tunnel-release procedure page rewrite
// per draft v1.0 at 01-brand-system/procedures/drgladysz-procedure-open-carpal-tunnel-release-draft-v1_0.md
// and brand spec v1.9 Decision #37 (selective first-person in pitfall callouts).
//
// Three-stage seed (idempotent):
//   1. Create/replace 29 glossaryTerm docs (the [[term]] markers in the draft)
//   2. Create/replace 14 bibReference docs (refs 1-6, 8-11, 13-15, 17 in the
//      bibliography; refs 7, 12, 16 already exist from Phase 5 seed)
//   3. Patch the procedurePage doc with body content that includes proper
//      citation and glossaryTerm marks pointing at the seeded docs.
//
// Body content uses an inline DSL:
//   [g:slug|displayed text]   — glossary mark (looks up slug in GLOSSARY_IDS)
//   {n}    or {n,m,p}         — citation marks for bibliography position n
//                                (looks up n in CITATION_BY_POSITION)
//   **bold**                  — strong
//   *italic*                  — em
//
// Run from /Users/mateusz/projects-local/drgladysz.com/site:
//   node --experimental-strip-types --env-file=.env.local scripts/seed-procedure-octr.ts

import { createClient } from '@sanity/client';

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

// ---- glossary seeds ---------------------------------------------------------

interface GlossarySeed {
  slug: string;
  term: string;
  category: string;
  shortDefinition: string;
  synonyms?: string[];
}

const GLOSSARY_SEEDS: GlossarySeed[] = [
  {
    slug: 'carpal-tunnel',
    term: 'carpal tunnel',
    category: 'anatomy',
    shortDefinition:
      'Fibro-osseous canal at the volar wrist, bounded by the proximal carpal row volarly, the scaphoid and trapezium radially, the pisiform and hook of hamate ulnarly, and the transverse carpal ligament dorsally. Transmits the nine flexor tendons of the digits and the median nerve.',
  },
  {
    slug: 'carpal-tunnel-syndrome',
    term: 'carpal tunnel syndrome',
    category: 'condition',
    shortDefinition:
      'Compressive neuropathy of the median nerve at the wrist, the most common entrapment neuropathy. Presents with nocturnal paraesthesia in the median distribution, positive provocative tests, and — in advanced disease — fixed sensory loss and thenar atrophy.',
    synonyms: ['CTS', 'median nerve compression at the wrist'],
  },
  {
    slug: 'median-nerve',
    term: 'median nerve',
    category: 'anatomy',
    shortDefinition:
      'Mixed motor and sensory nerve formed from the medial and lateral cords of the brachial plexus (C5–T1). Supplies most of the volar forearm flexors, the radial-side hand intrinsics via the recurrent thenar branch, and the volar skin of the thumb, index, middle, and radial half of the ring finger.',
  },
  {
    slug: 'transverse-carpal-ligament',
    term: 'transverse carpal ligament',
    category: 'anatomy',
    shortDefinition:
      'Thickened central portion of the flexor retinaculum forming the roof of the carpal tunnel. Spans from the scaphoid tubercle and trapezial ridge radially to the pisiform and hook of hamate ulnarly. Division of this ligament is the operative substance of carpal tunnel release.',
    synonyms: ['TCL', 'flexor retinaculum (central portion)'],
  },
  {
    slug: 'flexor-retinaculum',
    term: 'flexor retinaculum',
    category: 'anatomy',
    shortDefinition:
      'Composite ligamentous structure at the volar wrist with three components: the proximal antebrachial fascia, the central transverse carpal ligament, and the distal aponeurotic continuation between thenar and hypothenar muscles. The transverse carpal ligament is the load-bearing portion in carpal tunnel pathology.',
  },
  {
    slug: 'fibro-osseous-canal',
    term: 'fibro-osseous canal',
    category: 'anatomy',
    shortDefinition:
      'Anatomical channel with bony walls and a fibrous roof. The carpal tunnel is the prototypical example — bony floor and walls formed by the carpal bones, fibrous roof formed by the transverse carpal ligament.',
  },
  {
    slug: 'cts-6',
    term: 'CTS-6',
    category: 'investigation',
    shortDefinition:
      'Six-item clinical diagnostic instrument for carpal tunnel syndrome developed by Graham and colleagues (2006). Endorsed by the 2024 AAOS guideline as a stand-alone diagnostic tool in cases without atypical features, suspected polyneuropathy, or suspected cervical radiculopathy.',
  },
  {
    slug: 'phalen-test',
    term: 'Phalen test',
    category: 'investigation',
    shortDefinition:
      'Provocative test for carpal tunnel syndrome described by George Phalen (1966). The patient holds the wrist in maximal volar flexion for 60 seconds; reproduction of paraesthesia in the median distribution is a positive result.',
    synonyms: ["Phalen's manoeuvre", "Phalen's sign"],
  },
  {
    slug: 'tinel-sign',
    term: 'Tinel sign',
    category: 'investigation',
    shortDefinition:
      'Tapping over a peripheral nerve elicits paraesthesia in its sensory distribution; described by Jules Tinel in 1915 in the context of regenerating peripheral nerves. Positive over the median nerve at the wrist supports a diagnosis of carpal tunnel syndrome.',
    synonyms: ["Tinel's sign", 'Hoffmann–Tinel sign'],
  },
  {
    slug: 'durkan-compression-test',
    term: 'Durkan compression test',
    category: 'investigation',
    shortDefinition:
      'Direct pressure applied by examiner thumbs over the median nerve at the carpal tunnel for 30 seconds; reproduction of paraesthesia in the median distribution is a positive result. Described by Durkan (1991); generally considered the most sensitive of the provocative tests.',
    synonyms: ["Durkan's test", 'carpal compression test'],
  },
  {
    slug: 'thenar-atrophy',
    term: 'thenar atrophy',
    category: 'sign',
    shortDefinition:
      'Visible wasting of the thenar eminence muscles (abductor pollicis brevis, opponens pollicis, superficial head of flexor pollicis brevis) — a late sign of severe motor compromise of the recurrent thenar branch of the median nerve in advanced carpal tunnel syndrome.',
  },
  {
    slug: 'nerve-conduction-studies',
    term: 'nerve conduction studies',
    category: 'investigation',
    shortDefinition:
      'Electrodiagnostic investigation that measures distal motor latency, sensory nerve action potential amplitude, and conduction velocity along peripheral nerves. In carpal tunnel syndrome, prolonged distal motor latency and reduced sensory nerve action potential amplitude define disease severity.',
    synonyms: ['NCS', 'electrodiagnostic study', 'EMG/NCS'],
  },
  {
    slug: 'pcbmn',
    term: 'palmar cutaneous branch of the median nerve (PCBMN)',
    category: 'anatomy',
    shortDefinition:
      'Sensory branch arising from the median nerve 4–6 cm proximal to the wrist crease, running superficial to the flexor retinaculum to supply the skin of the thenar eminence. Injury produces a tender neuroma or numb patch at the thenar base.',
    synonyms: ['PCBMN', 'palmar cutaneous nerve'],
  },
  {
    slug: 'recurrent-motor-branch',
    term: 'recurrent motor branch of the median nerve',
    category: 'anatomy',
    shortDefinition:
      'Motor branch of the median nerve to the thenar muscles (abductor pollicis brevis, opponens pollicis, and superficial head of flexor pollicis brevis). Lanz described extraligamentous, subligamentous, and transligamentous variants. Lies radial to the median nerve at the carpal tunnel — preserved by ulnar-side entry into the tunnel.',
    synonyms: ['thenar motor branch', 'recurrent thenar branch', 'Lanz variants'],
  },
  {
    slug: 'superficial-palmar-arch',
    term: 'superficial palmar arch',
    category: 'anatomy',
    shortDefinition:
      'Vascular arch in the palm formed predominantly by the ulnar artery with a contribution from the superficial branch of the radial artery. Lies on average 6–11 mm distal to Kaplan\'s cardinal line — the practical reason a carpal tunnel release incision stops well proximal to that line.',
  },
  {
    slug: 'kaplans-cardinal-line',
    term: "Kaplan's cardinal line",
    category: 'anatomy',
    shortDefinition:
      'Surface marking line drawn from the apex of the first web space across the palm, parallel to the proximal palmar crease. Approximates the level of the superficial palmar arch and the distal extent of safe dissection in carpal tunnel release.',
  },
  {
    slug: 'hook-of-hamate',
    term: 'hook of hamate',
    category: 'anatomy',
    shortDefinition:
      'Volar bony projection of the hamate, forming the ulnar wall of the carpal tunnel. A palpable landmark approximately 2 cm distal and 2 cm radial to the pisiform; in carpal tunnel surgery, used as a topographical reference to keep the incision and dissection ulnar to the median nerve.',
  },
  {
    slug: 'trapezium',
    term: 'trapezium',
    category: 'anatomy',
    shortDefinition:
      'The most radial bone of the distal carpal row, articulating with the first metacarpal at the trapeziometacarpal joint. Forms the radial wall of the carpal tunnel together with the scaphoid.',
  },
  {
    slug: 'pisiform',
    term: 'pisiform',
    category: 'anatomy',
    shortDefinition:
      'Sesamoid bone in the tendon of flexor carpi ulnaris on the volar-ulnar aspect of the proximal carpal row; forms the ulnar wall of the carpal tunnel together with the hook of hamate.',
  },
  {
    slug: 'thenar-eminence',
    term: 'thenar eminence',
    category: 'anatomy',
    shortDefinition:
      'Muscular bulge at the radial base of the palm formed by abductor pollicis brevis, opponens pollicis, the superficial head of flexor pollicis brevis, and adductor pollicis (ulnar nerve innervation). Median-nerve innervation of the first three is the substrate for thenar atrophy in advanced carpal tunnel syndrome.',
  },
  {
    slug: 'abductor-pollicis-brevis',
    term: 'abductor pollicis brevis',
    category: 'anatomy',
    shortDefinition:
      'Superficial thenar muscle innervated by the recurrent thenar branch of the median nerve. Abducts the thumb perpendicular to the palm — the basis of the standard manual test for median-nerve motor function.',
    synonyms: ['APB'],
  },
  {
    slug: 'opponens-pollicis',
    term: 'opponens pollicis',
    category: 'anatomy',
    shortDefinition:
      'Deep thenar muscle innervated by the recurrent thenar branch of the median nerve. Rotates the first metacarpal and flexes it across the palm to oppose the thumb to the small finger.',
  },
  {
    slug: 'flexor-pollicis-brevis',
    term: 'flexor pollicis brevis',
    category: 'anatomy',
    shortDefinition:
      'Thenar muscle with two heads — superficial (recurrent thenar branch of median nerve) and deep (deep branch of ulnar nerve). The dual innervation explains residual thumb flexion strength after isolated median or ulnar palsy.',
    synonyms: ['FPB'],
  },
  {
    slug: 'pronator-syndrome',
    term: 'pronator syndrome',
    category: 'condition',
    shortDefinition:
      'Compression of the median nerve in the proximal forearm — at the lacertus fibrosus, between the heads of pronator teres, or at the proximal arch of flexor digitorum superficialis. Causes proximal median symptoms that may mimic carpal tunnel syndrome but typically with daytime forearm aching and tenderness over pronator teres.',
  },
  {
    slug: 'cubital-tunnel-syndrome',
    term: 'cubital tunnel syndrome',
    category: 'condition',
    shortDefinition:
      'Compression of the ulnar nerve at the elbow within the cubital tunnel. The second most common upper-limb compression neuropathy after carpal tunnel syndrome. Presents with paraesthesia in the small and ulnar-half of the ring finger and weakness of intrinsic hand muscles.',
  },
  {
    slug: 'complex-regional-pain-syndrome',
    term: 'complex regional pain syndrome',
    category: 'condition',
    shortDefinition:
      'Chronic regional pain disorder following injury or surgery, characterised by disproportionate pain, sensory disturbance, autonomic dysregulation (skin colour, temperature, sweating), motor or trophic changes, and restricted range of motion. Diagnosis is by Budapest criteria. Uncommon after carpal tunnel release (<1%) but recognised early through prompt referral.',
    synonyms: ['CRPS', 'reflex sympathetic dystrophy', 'algodystrophy'],
  },
  {
    slug: 'nsaid',
    term: 'NSAID',
    category: 'pharmacology',
    shortDefinition:
      'Non-steroidal anti-inflammatory drug — a class of analgesics that inhibits cyclo-oxygenase enzymes (COX-1 and COX-2) to reduce prostaglandin-mediated pain and inflammation. Combined with paracetamol, supported by strong evidence in the 2024 AAOS guideline as the routine post-operative analgesic regimen for carpal tunnel release.',
  },
  {
    slug: 'pillar-pain',
    term: 'pillar pain',
    category: 'symptom',
    shortDefinition:
      'Discomfort at the thenar and hypothenar bases on direct pressure or firm grip following carpal tunnel release, distinct from the incision site. Affects 13–49% of patients depending on definition; usually self-limiting by 3–6 months.',
  },
  {
    slug: 'endoscopic-carpal-tunnel-release',
    term: 'endoscopic carpal tunnel release',
    category: 'procedure',
    shortDefinition:
      'Alternative technique for division of the transverse carpal ligament via one or two short incisions and an endoscope-guided cutting blade. Trial-level evidence shows broadly equivalent long-term outcomes to open release; the choice between techniques is driven by surgeon experience and patient factors.',
    synonyms: ['ECTR', 'one-portal endoscopic CTR', 'two-portal Chow technique'],
  },
];

// glossary slug → Sanity _id
const GLOSSARY_IDS: Record<string, string> = {
  // existing (don't recreate)
  walant: 'glossary-walant',
  scaphoid: 'glossary-scaphoid',
  // new
  ...Object.fromEntries(
    GLOSSARY_SEEDS.map((g) => [g.slug, `glossary-${g.slug}`]),
  ),
};

// ---- bibReference seeds -----------------------------------------------------

interface BibSeed {
  _id: string;
  authors: string[];
  title: string;
  year: number;
  journal: string;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  doi?: string;
  pubType: 'journal' | 'book' | 'chapter' | 'guideline' | 'online';
}

const BIB_SEEDS: BibSeed[] = [
  {
    _id: 'graham-2006',
    authors: ['Graham B', 'Regehr G', 'Naglie G', 'Wright JG'],
    title: 'Development and validation of diagnostic criteria for carpal tunnel syndrome',
    year: 2006,
    journal: 'J Hand Surg Am',
    volume: '31',
    issue: '6',
    pages: '919-924',
    doi: '10.1016/j.jhsa.2006.03.005',
    pubType: 'journal',
  },
  {
    _id: 'aaos-2024-cts-cpg',
    authors: ['American Academy of Orthopaedic Surgeons'],
    title:
      'Management of Carpal Tunnel Syndrome — Evidence-Based Clinical Practice Guideline',
    year: 2024,
    journal: 'AAOS',
    pubType: 'guideline',
  },
  {
    _id: 'shapiro-2025-aaos-summary',
    authors: [
      'Shapiro LM',
      'Kamal RN',
      'Management of Carpal Tunnel Syndrome Work Group',
      'American Academy of Orthopaedic Surgeons',
    ],
    title:
      'American Academy of Orthopaedic Surgeons/ASSH Clinical Practice Guideline Summary: Management of Carpal Tunnel Syndrome',
    year: 2025,
    journal: 'J Am Acad Orthop Surg',
    volume: '33',
    issue: '7',
    pages: 'e356-e366',
    doi: '10.5435/JAAOS-D-24-01179',
    pubType: 'journal',
  },
  {
    _id: 'atroshi-2013-methylpred',
    authors: ['Atroshi I', 'Flondell M', 'Hofer M', 'Ranstam J'],
    title:
      'Methylprednisolone injections for the carpal tunnel syndrome: a randomized, placebo-controlled trial',
    year: 2013,
    journal: 'Ann Intern Med',
    volume: '159',
    issue: '5',
    pages: '309-317',
    doi: '10.7326/0003-4819-159-5-201309030-00004',
    pubType: 'journal',
  },
  {
    _id: 'hofer-2021-extended-followup',
    authors: ['Hofer M', 'Ranstam J', 'Atroshi I'],
    title:
      'Extended follow-up of local steroid injection for carpal tunnel syndrome: a randomized clinical trial',
    year: 2021,
    journal: 'JAMA Netw Open',
    volume: '4',
    issue: '10',
    pages: 'e2130753',
    doi: '10.1001/jamanetworkopen.2021.30753',
    pubType: 'journal',
  },
  {
    _id: 'panchal-2010-kaplan',
    authors: ['Panchal AP', 'Trzeciak MA'],
    title:
      "The clinical application of Kaplan's cardinal line as a surface marker for the superficial palmar arch",
    year: 2010,
    journal: 'Hand (N Y)',
    volume: '5',
    issue: '2',
    pages: '155-159',
    doi: '10.1007/s11552-009-9229-0',
    pubType: 'journal',
  },
  {
    _id: 'lalonde-2020-walant-book',
    authors: ['Lalonde DH'],
    title: 'Wide Awake Hand Surgery and Therapy Tips',
    year: 2020,
    journal: 'Thieme',
    pubType: 'book',
  },
  {
    _id: 'mosier-hughes-2013',
    authors: ['Mosier BA', 'Hughes TB'],
    title: 'Recurrent carpal tunnel syndrome',
    year: 2013,
    journal: 'Hand Clin',
    volume: '29',
    issue: '3',
    pages: '427-434',
    doi: '10.1016/j.hcl.2013.04.011',
    pubType: 'journal',
  },
  {
    _id: 'mackinnon-1991-internal-neurolysis',
    authors: ['Mackinnon SE', 'McCabe S', 'Murray JF'],
    title:
      'Internal neurolysis fails to improve the results of primary carpal tunnel decompression',
    year: 1991,
    journal: 'J Hand Surg Am',
    volume: '16',
    issue: '2',
    pages: '211-218',
    doi: '10.1016/S0363-5023(10)80098-7',
    pubType: 'journal',
  },
  {
    _id: 'wu-2023-monocryl-vs-nylon',
    authors: ['Wu E', 'Allen R', 'Bayne C', 'Szabo R'],
    title:
      'Prospective randomized controlled trial comparing the effect of Monocryl versus nylon sutures on patient- and observer-assessed outcomes following carpal tunnel surgery',
    year: 2023,
    journal: 'J Hand Surg Eur Vol',
    volume: '48',
    issue: '11',
    pages: '1084-1091',
    doi: '10.1177/17531934231178383',
    pubType: 'journal',
  },
  {
    _id: 'greco-2023-return-to-work',
    authors: ['Greco AT', 'Boyer MI', 'Calfee RP'],
    title:
      'Determinants of return to activity and work after carpal tunnel release: a systematic review and meta-analysis',
    year: 2023,
    journal: 'Expert Rev Med Devices',
    volume: '20',
    issue: '5',
    pages: '397-409',
    doi: '10.1080/17434440.2023.2195549',
    pubType: 'journal',
  },
  {
    _id: 'bonatz-2024-pillar-pain',
    authors: ['Bonatz E', 'Rajan S', 'Klausner AM', 'Frizzi JD'],
    title:
      'Pillar pain after minimally invasive and standard open carpal tunnel release: a systematic review and meta-analysis',
    year: 2024,
    journal: 'J Hand Surg Glob Online',
    volume: '6',
    issue: '4',
    pages: '523-528',
    doi: '10.1016/j.jhsg.2023.11.006',
    pubType: 'journal',
  },
  {
    _id: 'atroshi-2015-jama',
    authors: ['Atroshi I', 'Hofer M', 'Larsson GU', 'Ranstam J'],
    title:
      'Extended follow-up of a randomized clinical trial of open vs endoscopic release surgery for carpal tunnel syndrome',
    year: 2015,
    journal: 'JAMA',
    volume: '314',
    issue: '13',
    pages: '1399-1401',
    doi: '10.1001/jama.2015.12208',
    pubType: 'journal',
  },
  {
    _id: 'watchmaker-1996-pcbmn',
    authors: ['Watchmaker GP', 'Weber D', 'Mackinnon SE'],
    title:
      'Avoidance of transection of the palmar cutaneous branch of the median nerve in carpal tunnel release',
    year: 1996,
    journal: 'J Hand Surg Am',
    volume: '21',
    issue: '4',
    pages: '644-650',
    doi: '10.1016/S0363-5023(96)80019-0',
    pubType: 'journal',
  },
];

// bibliography position (1-indexed) → bibReference _id (mixes new + existing).
const CITATION_BY_POSITION: Record<number, string> = {
  1: 'graham-2006',
  2: 'aaos-2024-cts-cpg',
  3: 'shapiro-2025-aaos-summary',
  4: 'atroshi-2013-methylpred',
  5: 'hofer-2021-extended-followup',
  6: 'panchal-2010-kaplan',
  7: '0eedaaa6-b2ba-4f47-82ac-559ba81bea54', // Padua 2016 (existing)
  8: 'lalonde-2020-walant-book',
  9: 'mosier-hughes-2013',
  10: 'mackinnon-1991-internal-neurolysis',
  11: 'wu-2023-monocryl-vs-nylon',
  12: 'd498a81c-27f1-4698-bb00-2642fa1631e1', // Vasiliadis 2014 (existing)
  13: 'greco-2023-return-to-work',
  14: 'bonatz-2024-pillar-pain',
  15: 'atroshi-2015-jama',
  16: '4c61cd14-629e-464a-be3a-7b1aacf1da70', // Louie 2012 (existing)
  17: 'watchmaker-1996-pcbmn',
};

// ---- Portable Text helpers --------------------------------------------------

let counter = 0;
const k = () => `k${(++counter).toString(36)}`;

type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
type MarkDef = {
  _type: 'citation' | 'glossaryTerm';
  _key: string;
  reference?: { _type: 'reference'; _ref: string };
  term?: { _type: 'reference'; _ref: string };
};
type Block = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h2' | 'h3' | 'h4' | 'blockquote';
  markDefs: MarkDef[];
  children: Span[];
  listItem?: 'bullet' | 'number';
  level?: number;
};

function span(text: string, marks: string[] = []): Span {
  return { _type: 'span', _key: k(), text, marks };
}

// Token types after parsing inline DSL
type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'gloss'; slug: string; displayed: string }
  | { kind: 'cite'; positions: number[] };

// Parse one paragraph's raw text into ordered tokens.
//   [g:slug|displayed]   → glossary
//   {n}   or {n,m,...}   → citation
// Bold/italic markers are NOT tokenised here; they're consumed by inlineSpans.
function tokenize(input: string): InlineToken[] {
  const out: InlineToken[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === '[' && input[i + 1] === 'g' && input[i + 2] === ':') {
      const close = input.indexOf(']', i);
      if (close === -1) {
        out.push({ kind: 'text', text: input.slice(i) });
        break;
      }
      const inner = input.slice(i + 3, close);
      const pipe = inner.indexOf('|');
      if (pipe === -1) throw new Error(`Bad glossary marker: ${inner}`);
      out.push({
        kind: 'gloss',
        slug: inner.slice(0, pipe),
        displayed: inner.slice(pipe + 1),
      });
      i = close + 1;
      continue;
    }
    if (input[i] === '{' && /\d/.test(input[i + 1] ?? '')) {
      const close = input.indexOf('}', i);
      if (close === -1) {
        out.push({ kind: 'text', text: input.slice(i) });
        break;
      }
      const positions = input
        .slice(i + 1, close)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      out.push({ kind: 'cite', positions });
      i = close + 1;
      continue;
    }
    // accumulate text up to next marker
    let j = i;
    while (j < input.length) {
      const slice = input.slice(j);
      if (
        slice.startsWith('[g:') ||
        (slice[0] === '{' && /\d/.test(slice[1] ?? ''))
      ) {
        break;
      }
      j++;
    }
    out.push({ kind: 'text', text: input.slice(i, j) });
    i = j;
  }
  return out;
}

// Apply **bold** and *italic* markup within a plain text segment, producing
// spans tagged with 'strong' or 'em' marks.
function applyEmphasis(text: string, extraMarks: string[] = []): Span[] {
  // Pass 1: split on **bold**
  const out: Span[] = [];
  const parts: { text: string; bold: boolean }[] = [];
  let cursor = 0;
  const boldHits = [...text.matchAll(/\*\*([^*]+)\*\*/g)];
  if (boldHits.length === 0) {
    parts.push({ text, bold: false });
  } else {
    for (const m of boldHits) {
      const idx = m.index ?? 0;
      if (idx > cursor) parts.push({ text: text.slice(cursor, idx), bold: false });
      parts.push({ text: m[1], bold: true });
      cursor = idx + m[0].length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), bold: false });
  }
  // Pass 2: italics inside non-bold parts
  for (const part of parts) {
    if (part.bold) {
      out.push(span(part.text, [...extraMarks, 'strong']));
      continue;
    }
    const itHits = [...part.text.matchAll(/\*([^*]+)\*/g)];
    if (itHits.length === 0) {
      if (part.text) out.push(span(part.text, extraMarks));
      continue;
    }
    let c = 0;
    for (const m of itHits) {
      const idx = m.index ?? 0;
      if (idx > c) out.push(span(part.text.slice(c, idx), extraMarks));
      out.push(span(m[1], [...extraMarks, 'em']));
      c = idx + m[0].length;
    }
    if (c < part.text.length) out.push(span(part.text.slice(c), extraMarks));
  }
  return out;
}

function richBlock(
  input: string,
  opts: {
    style?: Block['style'];
    listItem?: 'bullet' | 'number';
    level?: number;
  } = {},
): Block {
  const tokens = tokenize(input);
  const markDefs: MarkDef[] = [];
  const children: Span[] = [];

  // Helper: convert pending citation positions (after a text span) into marks
  // that attach to the LAST emitted span. This matches the Citation.astro
  // convention where the superscript marker renders AFTER the span text.
  const attachCitations = (positions: number[]) => {
    if (positions.length === 0 || children.length === 0) return;
    for (const pos of positions) {
      const refId = CITATION_BY_POSITION[pos];
      if (!refId) {
        throw new Error(`No bibReference mapped for citation position ${pos}`);
      }
      const mark: MarkDef = {
        _type: 'citation',
        _key: k(),
        reference: { _type: 'reference', _ref: refId },
      };
      markDefs.push(mark);
      // Attach the mark to the most recent text-bearing span
      const last = children[children.length - 1];
      last.marks = [...last.marks, mark._key];
    }
  };

  for (const tok of tokens) {
    if (tok.kind === 'text') {
      const spans = applyEmphasis(tok.text);
      children.push(...spans);
      continue;
    }
    if (tok.kind === 'gloss') {
      const glossId = GLOSSARY_IDS[tok.slug];
      if (!glossId) {
        throw new Error(`Unknown glossary slug: ${tok.slug}`);
      }
      const mark: MarkDef = {
        _type: 'glossaryTerm',
        _key: k(),
        term: { _type: 'reference', _ref: glossId },
      };
      markDefs.push(mark);
      children.push(span(tok.displayed, [mark._key]));
      continue;
    }
    if (tok.kind === 'cite') {
      attachCitations(tok.positions);
      continue;
    }
  }

  if (children.length === 0) children.push(span(''));

  return {
    _type: 'block',
    _key: k(),
    style: opts.style ?? 'normal',
    markDefs,
    children,
    ...(opts.listItem
      ? { listItem: opts.listItem, level: opts.level ?? 1 }
      : {}),
  };
}

const p = (s: string) => richBlock(s);
const bullet = (s: string) => richBlock(s, { listItem: 'bullet', level: 1 });
const num = (s: string) => richBlock(s, { listItem: 'number', level: 1 });
const h3 = (s: string) => richBlock(s, { style: 'h3' });

// ---- procedure body ---------------------------------------------------------

const indications: Block[] = [
  p(
    'Open carpal tunnel release is indicated for adults with [g:carpal-tunnel-syndrome|carpal tunnel syndrome] whose symptoms have not resolved with conservative measures, or whose presentation is severe enough that conservative measures are unlikely to succeed.',
  ),
  p('The clinical picture combines:'),
  bullet(
    'nocturnal numbness and paraesthesia in the [g:median-nerve|median nerve] distribution — the thumb, index, middle, and radial half of the ring finger;',
  ),
  bullet(
    'positive provocative findings on examination — [g:phalen-test|Phalen test], [g:tinel-sign|Tinel sign], [g:durkan-compression-test|Durkan compression test];',
  ),
  bullet(
    'in more advanced disease, fixed sensory loss, weakness of thumb abduction, and visible [g:thenar-atrophy|thenar atrophy].',
  ),
  p(
    'A clinical diagnosis may be made using the [g:cts-6|CTS-6] criteria of Graham et al., which the 2024 American Academy of Orthopaedic Surgeons (AAOS) clinical practice guideline endorses as a stand-alone diagnostic instrument in cases without diagnostic uncertainty — that is, without atypical features, suspected polyneuropathy, or suspected cervical radiculopathy.{1,2} Where the picture is ambiguous, [g:nerve-conduction-studies|nerve conduction studies] remain useful for confirmation and for severity grading.{3}',
  ),
  p('Surgery is offered when:'),
  bullet(
    'nocturnal symptoms persist despite a documented trial of night-time wrist splinting and activity modification;',
  ),
  bullet(
    'there is constant numbness, sensory loss on two-point discrimination, or measurable thenar weakness;',
  ),
  bullet(
    'electrodiagnostic studies show moderate-to-severe disease with prolonged distal motor latency or reduced compound muscle action potential amplitude;',
  ),
  bullet(
    'acute carpal tunnel syndrome develops after distal radius fracture, perilunate dislocation, or other wrist trauma — in which case decompression is urgent rather than elective.',
  ),
  p(
    'A trial of corticosteroid injection has a defined, narrow role: 80 mg methylprednisolone delays the time to surgery at five years compared with placebo, but does not produce durable symptom resolution and does not change the indication for definitive release once symptoms recur.{4,5}',
  ),
  p(
    'The 2024 AAOS guideline also withdraws the routine recommendation for postoperative supervised therapy and post-operative splinting on the basis of moderate evidence, and finds no long-term benefit of platelet-rich plasma in carpal tunnel syndrome.{2} Practice decisions on these adjuncts are addressed in § 08 Aftercare.',
  ),
];

const contraindications: Block[] = [
  p(
    'There are no specific anatomical contraindications to open release. General considerations apply:',
  ),
  bullet(
    '**Diagnostic uncertainty.** Symptoms that do not localise convincingly to the median nerve distribution warrant further work-up — cervical radiculopathy, [g:pronator-syndrome|pronator syndrome] (proximal median compression), [g:cubital-tunnel-syndrome|cubital tunnel syndrome], thoracic outlet syndrome, and small-fibre polyneuropathy may all mimic carpal tunnel syndrome.',
  ),
  bullet('**Untreated infection** at the operative site.'),
  bullet(
    '**Coagulopathy** or anticoagulation that cannot be safely managed peri-operatively.',
  ),
  bullet(
    '**Patient unable to cooperate** with awake surgery — in which case the operation is not contraindicated, but the anaesthetic plan adapts; regional or general anaesthesia is then used.',
  ),
  bullet(
    'In **[g:complex-regional-pain-syndrome|complex regional pain syndrome]** or active flare of inflammatory arthritis affecting the wrist, surgery is timed and planned in conjunction with the relevant specialist.',
  ),
];

const anatomy: Block[] = [
  p(
    'The [g:carpal-tunnel|carpal tunnel] is a [g:fibro-osseous-canal|fibro-osseous canal] at the wrist. Its floor is formed by the volar surfaces of the proximal carpal row; its walls are the [g:scaphoid|scaphoid] and [g:trapezium|trapezium] radially and the [g:pisiform|pisiform] and [g:hook-of-hamate|hook of hamate] ulnarly; its roof is the [g:transverse-carpal-ligament|transverse carpal ligament], the thickened central portion of the [g:flexor-retinaculum|flexor retinaculum]. The tunnel transmits ten structures: nine flexor tendons — four flexor digitorum superficialis, four flexor digitorum profundus, and flexor pollicis longus — and the median nerve.',
  ),
  p('Three nerve branches define the surgical risk zones:'),
  bullet(
    'the **[g:pcbmn|palmar cutaneous branch of the median nerve] (PCBMN)**, which arises 4–6 cm proximal to the wrist crease, runs superficial to the flexor retinaculum, and supplies the skin of the [g:thenar-eminence|thenar eminence];',
  ),
  bullet(
    'the **[g:recurrent-motor-branch|recurrent (thenar) motor branch of the median nerve]**, with extraligamentous, subligamentous, and transligamentous variants described by Lanz, supplying [g:abductor-pollicis-brevis|abductor pollicis brevis], [g:opponens-pollicis|opponens pollicis], and the superficial head of [g:flexor-pollicis-brevis|flexor pollicis brevis];',
  ),
  bullet(
    'the **palmar cutaneous branch of the ulnar nerve**, which crosses the hypothenar fat at risk only with very ulnar incisions.',
  ),
  p(
    "The distal extent of safe dissection is bounded by the [g:superficial-palmar-arch|superficial palmar arch], which lies on average 6–11 mm distal to [g:kaplans-cardinal-line|Kaplan's cardinal line] — the line drawn from the apex of the first web space across the palm parallel to the proximal palmar crease.{6,7} This is the practical reason a safe incision stops well proximal to Kaplan's line.",
  ),
];

const positioning: Block[] = [
  p(
    'The patient is supine, with the operative arm abducted on a hand table, forearm supinated, fingers and thumb gently extended. A non-sterile pneumatic upper-arm tourniquet is applied. Local infiltration is performed with lidocaine 1% (with or without epinephrine, surgeon preference) along the planned incision and into the carpal tunnel; tourniquet is inflated for the operative phase and deflated before closure for haemostasis. Skin marking is performed before infiltration, with the surgeon seated at the head of the hand table.',
  ),
  p(
    '[g:walant|WALANT] (wide-awake local anaesthesia, no tourniquet — lidocaine with epinephrine, no tourniquet) is an alternative anaesthetic approach with strong evidence support in the 2024 AAOS guideline for carpal tunnel release.{2,8} It is covered in detail on a separate page; this page describes the tourniquet-and-local-infiltration approach used in this practice.',
  ),
];

const approach: Block[] = [
  p(
    "The skin incision is longitudinal, in line with the radial border of the ring finger, beginning 1–2 mm distal to the distal wrist crease. Length is 2–3 cm. The distal limit of the incision sits well proximal to Kaplan's cardinal line — the entire dissection is contained within the safe zone proximal to the superficial palmar arch.",
  ),
];

type KeyStep = {
  _type: 'procedureStep';
  _key: string;
  title: string;
  description: Block[];
  pitfall?: string;
};

function step(title: string, descParas: string[], pitfall?: string): KeyStep {
  return {
    _type: 'procedureStep',
    _key: k(),
    title,
    description: descParas.map((para) => p(para)),
    ...(pitfall ? { pitfall } : {}),
  };
}

const keySteps: KeyStep[] = [
  step(
    'Skin and subcutaneous fat',
    [
      'A No. 15 blade incises skin and subcutaneous fat in the line of the marked incision. Self-retaining retractors are placed and the wound is irrigated.',
    ],
    "I keep the incision well proximal to Kaplan's line and ulnar to the thenar crease. Proximal-to-the-crease extension risks the palmar cutaneous branch of the median nerve; thenar-crease incisions scar over the nerve and are tender with grip. A 2–3 cm incision gives more than enough exposure for direct-vision release; longer incisions add scar without adding safety.",
  ),
  step('Palmar fascia', [
    'The palmar fascia, with longitudinally oriented fibres, is divided sharply along the line of incision, exposing the supraretinacular fat pad and the underlying transverse fibres of the transverse carpal ligament.',
  ]),
  step(
    'TCL identification and entry',
    [
      'A small incision is made in the transverse carpal ligament at its ulnar third to enter the carpal tunnel under direct vision. The median nerve is identified at the proximal aspect of the wound and protected.',
    ],
    'I enter ulnar to the median nerve. The recurrent motor branch and the bulk of Lanz variations are radial; ulnar entry preserves them. A radial entry risks the recurrent motor branch and scars onto the nerve.',
  ),
  step(
    'Mobilisation and isolation',
    [
      'Metzenbaum scissors are used to mobilise and free the median nerve and to develop the planes both deep to the TCL — between the ligament and the median nerve — and superficial to the TCL — between the ligament and the overlying subcutis. The TCL is thus isolated from above and below before any division, with the proximal and distal limits of the ligament directly visualised.',
    ],
    'I isolate the transverse carpal ligament from below and above with Metzenbaum scissors before I divide it. Visualising both planes confirms the proximal limit at the distal antebrachial fascia and the distal limit at the volar fat pad before the cut is made. Dividing without prior isolation is faster but the proximal release is then routinely incomplete — and incomplete release is the leading driver of revision surgery.',
  ),
  step(
    'Complete division of the TCL',
    [
      'The transverse carpal ligament is divided in its entirety from proximal to distal under direct vision. Proximal division is performed with Metzenbaum scissors, advancing into the distal antebrachial fascia at the volar wrist crease and releasing it. Distal division is performed with a No. 15 scalpel through the volar fat pad to the distal edge of the ligament.',
    ],
    'I divide proximally with scissors and switch to a No. 15 scalpel for the distal release. Scalpel division at the volar fat pad stops cleanly at the distal edge of the ligament and respects the boundary of the superficial palmar arch; scissors continued distally can advance further than intended. The instrument switch is the safety margin.',
  ),
  step(
    'Inspection',
    [
      'The carpal tunnel is inspected. Synovial appearance, anatomical variation — bifid median nerve, persistent median artery, intraligamentous recurrent motor branch — and any space-occupying lesions are noted. Tourniquet is released and small bleeders are controlled with bipolar diathermy. Saline irrigation.',
    ],
    'I do not perform routine internal neurolysis, epineurotomy, or flexor tenosynovectomy. None improves outcomes in primary carpal tunnel syndrome and they carry their own morbidity. They are reserved for specific intra-operative findings — rheumatoid synovitis, dialysis-related amyloid, an obvious mass — and the indication is decided on the table, not in advance.{9,10}',
  ),
];

const closure: Block[] = [
  p(
    'Skin closure is by interrupted simple sutures of 4-0 nylon. A non-circumferential soft bulky dressing is applied — a tight or restrictive wrist dressing is unnecessary and counter-productive.{11} Sutures are removed at 10–14 days.',
  ),
  p(
    'Trial-level evidence shows broadly equivalent long-term scar quality between interrupted non-absorbable closure and running subcuticular absorbable closure for carpal tunnel release wounds, with subcuticular absorbable closure delivering modestly better early scar appearance and avoiding suture-removal discomfort.{11,12} The choice is surgeon-preference within that evidence base.',
  ),
];

const aftercare: Block[] = [
  p(
    'Immediate finger range of motion is encouraged; the operative hand is used for light pain-free activities from the first day. No splint is applied, and no post-operative immobilisation is recommended — the 2024 AAOS guideline rates the evidence for routine post-operative immobilisation as moderately against, on the basis that uncomplicated patients recover function more rapidly without it.{2}',
  ),
  p(
    'Routine referral to a hand therapist is made for all patients in this practice. The referral covers a single early consultation for graduated finger and wrist active range of motion, oedema management, scar management once the wound is healed, and structured guidance on return-to-work timing. The 2024 AAOS guideline rates the evidence for routine supervised therapy as moderately against on the basis that uncomplicated patients recover function without it; the rationale for routine referral here is the value of an early structured consultation in setting realistic expectations, identifying the minority of patients with developing pillar pain or stiffness, and supporting the return-to-work conversation — particularly for manual workers, for whom structured rehabilitation reduces uncertainty and protects against premature loading.',
  ),
  p('A practical timeline:'),
  bullet(
    '**Day 0–2.** Elevation when comfortable; finger flexion and extension exercises encouraged. Simple analgesia — paracetamol with [g:nsaid|NSAID] — is recommended; AAOS rates this combination as supported by strong evidence.{2}',
  ),
  bullet(
    '**Day 1–7.** Light tasks of daily living. The dressing is kept dry. Most patients sleep through the night within the first few nights; relief of nocturnal paraesthesia is typically the first symptom to resolve.',
  ),
  bullet(
    '**Day 10–14.** Wound review and removal of sutures. Driving is reasonable once the patient can grip the steering wheel comfortably and operate controls — typically by 1–2 weeks.',
  ),
  bullet(
    '**Week 2–4.** Return to most desk-based and light manual work. Pooled literature gives mean return-to-activity around 13 days and return-to-work in the 2–3-week range, with manual work typically requiring 4–6 weeks.{13}',
  ),
  bullet(
    "**Month 1–3.** [g:pillar-pain|Pillar pain] — discomfort at the thenar and hypothenar bases on direct pressure, distinct from the incision — affects a substantial minority of patients. Most cases resolve by 3–6 months.{14}",
  ),
  bullet(
    '**Month 3–6.** Recovery of grip strength is gradual and is usually complete by six months. Persistent numbness in patients with severe pre-operative axonal loss may take longer to resolve, and may not resolve completely.',
  ),
  p(
    'Scar massage, started once the wound is healed at around two weeks, is offered as a self-managed measure to soften the scar; it is not formally evidence-based but is low-burden and low-risk.',
  ),
];

const complications: Block[] = [
  p(
    'Major complications of open carpal tunnel release — those requiring readmission or revision — sit below 1% in large series.{15} Lesser complications are more common and are discussed with patients pre-operatively as a routine part of consent.',
  ),
  bullet(
    '**Persistent or recurrent symptoms.** Heterogeneous figures across the literature: 1–25% have some persistent or recurrent symptoms; revision is required in around 5% in large series, and approximately 3% have true recurrence after a symptom-free interval.{9,16} The most common cause is incomplete division of the transverse carpal ligament or its proximal antebrachial-fascia continuation.',
  ),
  bullet(
    '**Pillar pain.** Reported in 13–49% of patients depending on definition and method of assessment; usually self-limiting by 3–6 months.{14}',
  ),
  bullet(
    '**Scar tenderness.** Reported in 7–61% of patients across older series; minimised by an in-line incision ulnar to the thenar crease and by careful skin closure.{12}',
  ),
  bullet(
    '**Palmar cutaneous branch injury.** Causes a tender neuroma or numb patch at the thenar base; minimised by keeping the proximal limit of the incision distal to the wrist crease and by staying ulnar to the thenar crease.{17}',
  ),
  bullet(
    '**Recurrent motor branch injury.** Rare but functionally significant; prevented by ulnar-side entry into the tunnel.',
  ),
  bullet(
    '**Median nerve injury.** Major nerve injury occurs in less than 0.5% of cases in published series.{15}',
  ),
  bullet(
    "**Superficial palmar arch injury.** Avoided by stopping the dissection well proximal to Kaplan's cardinal line.{6}",
  ),
  bullet(
    '**Wound complications.** Surgical site infection less than 1%; haematoma rare with adequate haemostasis and a soft dressing.',
  ),
  bullet(
    '**Complex regional pain syndrome.** Uncommon (<1%); recognition and prompt referral matter more than prevention.',
  ),
];

const evidence: Block[] = [
  num(
    'Graham B, Regehr G, Naglie G, Wright JG. Development and validation of diagnostic criteria for carpal tunnel syndrome. *J Hand Surg Am*. 2006;31(6):919-924. doi:10.1016/j.jhsa.2006.03.005',
  ),
  num(
    'American Academy of Orthopaedic Surgeons. *Management of Carpal Tunnel Syndrome — Evidence-Based Clinical Practice Guideline*. Published 18 May 2024. Available at: aaos.org/cts2cpg',
  ),
  num(
    'Shapiro LM, Kamal RN; Management of Carpal Tunnel Syndrome Work Group; American Academy of Orthopaedic Surgeons. American Academy of Orthopaedic Surgeons/ASSH Clinical Practice Guideline Summary: Management of Carpal Tunnel Syndrome. *J Am Acad Orthop Surg*. 2025;33(7):e356-e366. doi:10.5435/JAAOS-D-24-01179',
  ),
  num(
    'Atroshi I, Flondell M, Hofer M, Ranstam J. Methylprednisolone injections for the carpal tunnel syndrome: a randomized, placebo-controlled trial. *Ann Intern Med*. 2013;159(5):309-317. doi:10.7326/0003-4819-159-5-201309030-00004',
  ),
  num(
    'Hofer M, Ranstam J, Atroshi I. Extended follow-up of local steroid injection for carpal tunnel syndrome: a randomized clinical trial. *JAMA Netw Open*. 2021;4(10):e2130753. doi:10.1001/jamanetworkopen.2021.30753',
  ),
  num(
    "Panchal AP, Trzeciak MA. The clinical application of Kaplan's cardinal line as a surface marker for the superficial palmar arch. *Hand (N Y)*. 2010;5(2):155-159. doi:10.1007/s11552-009-9229-0",
  ),
  num(
    'Padua L, Coraci D, Erra C, et al. Carpal tunnel syndrome: clinical features, diagnosis, and management. *Lancet Neurol*. 2016;15(12):1273-1284. doi:10.1016/S1474-4422(16)30231-9',
  ),
  num(
    'Lalonde DH. *Wide Awake Hand Surgery and Therapy Tips*. 2nd ed. Thieme; 2020.',
  ),
  num(
    'Mosier BA, Hughes TB. Recurrent carpal tunnel syndrome. *Hand Clin*. 2013;29(3):427-434. doi:10.1016/j.hcl.2013.04.011',
  ),
  num(
    'Mackinnon SE, McCabe S, Murray JF, et al. Internal neurolysis fails to improve the results of primary carpal tunnel decompression. *J Hand Surg Am*. 1991;16(2):211-218. doi:10.1016/S0363-5023(10)80098-7',
  ),
  num(
    'Wu E, Allen R, Bayne C, Szabo R. Prospective randomized controlled trial comparing the effect of Monocryl versus nylon sutures on patient- and observer-assessed outcomes following carpal tunnel surgery. *J Hand Surg Eur Vol*. 2023;48(11):1084-1091. doi:10.1177/17531934231178383',
  ),
  num(
    'Vasiliadis HS, Georgoulas P, Shrier I, Salanti G, Scholten RJPM. Endoscopic release for carpal tunnel syndrome. *Cochrane Database Syst Rev*. 2014;(1):CD008265. doi:10.1002/14651858.CD008265.pub2',
  ),
  num(
    'Greco AT, Boyer MI, Calfee RP. Determinants of return to activity and work after carpal tunnel release: a systematic review and meta-analysis. *Expert Rev Med Devices*. 2023;20(5):397-409. doi:10.1080/17434440.2023.2195549',
  ),
  num(
    'Bonatz E, Rajan S, Klausner AM, Frizzi JD. Pillar pain after minimally invasive and standard open carpal tunnel release: a systematic review and meta-analysis. *J Hand Surg Glob Online*. 2024;6(4):523-528. doi:10.1016/j.jhsg.2023.11.006',
  ),
  num(
    'Atroshi I, Hofer M, Larsson GU, Ranstam J. Extended follow-up of a randomized clinical trial of open vs endoscopic release surgery for carpal tunnel syndrome. *JAMA*. 2015;314(13):1399-1401. doi:10.1001/jama.2015.12208',
  ),
  num(
    'Louie DL, Earp BE, Blazar PE. Long-term outcomes of carpal tunnel release: a critical review of the literature. *Hand (N Y)*. 2012;7(3):242-246. doi:10.1007/s11552-012-9429-x',
  ),
  num(
    'Watchmaker GP, Weber D, Mackinnon SE. Avoidance of transection of the palmar cutaneous branch of the median nerve in carpal tunnel release. *J Hand Surg Am*. 1996;21(4):644-650. doi:10.1016/S0363-5023(96)80019-0',
  ),
];

const patientSummary: Block[] = [
  h3('What the operation involves'),
  p(
    'Open carpal tunnel release is a small operation to take pressure off the median nerve at your wrist. The surgeon makes a 2–3 cm cut in the palm, divides the ligament that is squeezing the nerve, and closes the skin with stitches. The operating time is about ten minutes. The whole hospital visit, from arrival to discharge, usually takes two to three hours.',
  ),
  p(
    'You are awake during the operation. The hand and wrist are numbed with local anaesthetic, and a tourniquet on your upper arm prevents bleeding so the surgeon can see clearly. You may feel pressure but should not feel pain. If you would prefer not to be awake, alternative anaesthetic options can be discussed at consultation.',
  ),
  h3('The first week'),
  p(
    'You go home with a soft padded dressing on your hand and wrist. You are encouraged to move your fingers gently from the first day — keeping them moving prevents stiffness and helps reduce swelling. Keep the hand elevated when you can. Most people sleep through the night within the first few nights; the relief from night-time numbness and tingling is usually the first thing to improve.',
  ),
  p(
    'The dressing stays on and stays dry until your wound check at 10 to 14 days. Simple painkillers — paracetamol with anti-inflammatories if you can take them — are usually enough. You can use the hand for light tasks: holding a cup, getting dressed, light kitchen work. Avoid heavy lifting, tight gripping, and getting the dressing wet.',
  ),
  h3('Driving and work'),
  p(
    'You can drive once you can grip the steering wheel comfortably and operate the controls — for most people, this is by one to two weeks. You should not drive on the day of surgery.',
  ),
  p(
    'Most people in office or desk-based work return within two to three weeks. Manual work typically takes four to six weeks. The exact timing depends on what your work involves, and the hand therapist will help plan the return.',
  ),
  h3('The next three to six months'),
  p(
    'Some discomfort at the base of the palm — known as pillar pain — is common in the months after surgery. It is felt at the base of the thumb side and the small-finger side of the palm when you push on those areas or grip firmly. Most cases settle by three to six months. It is annoying but not dangerous.',
  ),
  p(
    'Grip strength returns gradually. Most people are back to full grip strength by six months. If your numbness was severe before the operation, sensation in the fingers may keep recovering for up to a year, and in some cases a small amount of numbness may remain permanently — this is more common when the nerve has been compressed for a long time before surgery.',
  ),
  h3('What to call us about'),
  p('Contact the practice if you notice:'),
  bullet(
    'spreading redness around the wound, increasing pain after the first few days, or a discharge from the wound;',
  ),
  bullet('a fever above 38°C or feeling generally unwell;'),
  bullet(
    'new or worsening numbness, weakness, or severe pain in the hand that is different from before the operation;',
  ),
  bullet('the dressing falls off or becomes very wet — we can replace it.'),
  p(
    'For non-urgent questions about recovery, the hand therapist is your first point of contact between the operation and the wound check.',
  ),
  h3('Hand therapy'),
  p(
    'You will be referred to a hand therapist before or at the time of your operation. The first appointment is usually within the first one to two weeks after surgery. The therapist will guide your exercises, manage any swelling, work on the scar once it is healed, and help plan your return to work and to heavier activities. This service is part of routine care.',
  ),
];

const keyPoints = {
  question:
    'When is open carpal tunnel release indicated, and what does the operation involve?',
  findings:
    'Open release is indicated for clinically diagnosed carpal tunnel syndrome with persistent or escalating symptoms despite a trial of night splinting, with objective sensory or motor deficit, or with electrodiagnostic evidence of moderate-to-severe disease. The transverse carpal ligament is divided through a 2–3 cm palmar incision under tourniquet and local infiltration, in approximately 10 minutes of operative time, as a day case. Long-term symptom relief is durable; revision rates in large series sit at around 5%.',
  meaning:
    'In the appropriately selected patient, open carpal tunnel release is a definitive intervention with a low complication rate and a predictable recovery; the choice between open and endoscopic technique is driven by surgeon experience and patient factors rather than by any decisive long-term outcome difference.',
};

// ---- main ----------------------------------------------------------

const PROCEDURE_ID = 'e238943e-dc53-40ad-b02c-b4ba2ed07702';

async function seedGlossary() {
  console.log(`Seeding ${GLOSSARY_SEEDS.length} glossary terms…`);
  const tx = client.transaction();
  for (const g of GLOSSARY_SEEDS) {
    tx.createOrReplace({
      _id: `glossary-${g.slug}`,
      _type: 'glossaryTerm',
      term: g.term,
      slug: { _type: 'slug', current: g.slug },
      category: g.category,
      shortDefinition: g.shortDefinition,
      ...(g.synonyms ? { synonyms: g.synonyms } : {}),
    });
  }
  await tx.commit({ visibility: 'sync' });
  console.log(`✓ ${GLOSSARY_SEEDS.length} glossary terms seeded`);
}

async function seedReferences() {
  console.log(`Seeding ${BIB_SEEDS.length} bibReferences…`);
  const tx = client.transaction();
  for (const r of BIB_SEEDS) {
    tx.createOrReplace({
      _id: r._id,
      _type: 'bibReference',
      authors: r.authors,
      title: r.title,
      year: r.year,
      journal: r.journal,
      ...(r.volume ? { volume: r.volume } : {}),
      ...(r.issue ? { issue: r.issue } : {}),
      ...(r.pages ? { pages: r.pages } : {}),
      ...(r.pmid ? { pmid: r.pmid } : {}),
      ...(r.doi ? { doi: r.doi } : {}),
      pubType: r.pubType,
    });
  }
  await tx.commit({ visibility: 'sync' });
  console.log(`✓ ${BIB_SEEDS.length} bibReferences seeded`);
}

async function patchProcedure() {
  console.log('Patching procedurePage with marked body…');
  const res = await client
    .patch(PROCEDURE_ID)
    .set({
      title: 'Open Carpal Tunnel Release',
      audience: 'mixed',
      lastUpdated: '2026-05-03',
      seoTitle: 'Open Carpal Tunnel Release — Surgical Technique',
      seoDescription:
        'Open release of the transverse carpal ligament — indications, anatomy, key surgical steps with technique pitfalls, aftercare, and complications. Authored by a consultant hand surgeon.',
      keyPoints,
      indications,
      contraindications,
      anatomy,
      positioning,
      approach,
      keySteps,
      closure,
      aftercare,
      complications,
      evidence,
      patientSummary,
    })
    .commit({ visibility: 'sync', autoGenerateArrayKeys: true });
  console.log(`✓ Patched procedure ${res._id} (rev ${res._rev})`);
}

async function main() {
  await seedGlossary();
  await seedReferences();
  await patchProcedure();
  console.log('\nDone. Build the site to surface the new content.');
}

main().catch((err: any) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
