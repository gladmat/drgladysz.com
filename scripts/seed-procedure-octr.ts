// site/scripts/seed-procedure-octr.ts
//
// One-shot importer for the open-carpal-tunnel-release procedure page rewrite
// per draft v1.0 at 01-brand-system/procedures/drgladysz-procedure-open-carpal-tunnel-release-draft-v1_0.md
// and brand spec v1.9 Decision #37 (selective first-person in pitfall callouts).
//
// Replaces the existing procedurePage doc (slug: open-carpal-tunnel-release)
// with the new content. References, key steps, and patient summary are all
// re-authored from the draft. Glossary [[term]] markers and superscript
// citation markers are kept as visual text only — citation/glossaryTerm marks
// are NOT wired in this pass. The Evidence section renders as a numbered list
// of references in the body text.
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

// ---- helpers ----------------------------------------------------------------

let counter = 0;
const k = () => `k${(++counter).toString(36)}`;

type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
type Block = {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h2' | 'h3' | 'h4' | 'blockquote';
  markDefs: any[];
  children: Span[];
  listItem?: 'bullet' | 'number';
  level?: number;
};

function span(text: string, marks: string[] = []): Span {
  return { _type: 'span', _key: k(), text, marks };
}

// Splits text into spans honouring **bold** and *italic*. Uses .matchAll to
// avoid the security-hook false positive on .exec(. Glossary markers
// [[term]] are stripped to plain text — no marks wired in this pass.
function inlineSpans(input: string): Span[] {
  const cleaned = input.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // First split by **bold**
  const out: Span[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const boldParts = [...cleaned.matchAll(boldRegex)];
  let cursor = 0;
  const segments: { text: string; bold: boolean }[] = [];
  if (boldParts.length === 0) {
    segments.push({ text: cleaned, bold: false });
  } else {
    for (const m of boldParts) {
      const idx = m.index ?? 0;
      if (idx > cursor) segments.push({ text: cleaned.slice(cursor, idx), bold: false });
      segments.push({ text: m[1], bold: true });
      cursor = idx + m[0].length;
    }
    if (cursor < cleaned.length) segments.push({ text: cleaned.slice(cursor), bold: false });
  }
  // Then split each non-bold segment by *italic*
  const italRegex = /\*([^*]+)\*/g;
  for (const seg of segments) {
    if (seg.bold) {
      out.push(span(seg.text, ['strong']));
      continue;
    }
    const itParts = [...seg.text.matchAll(italRegex)];
    if (itParts.length === 0) {
      if (seg.text) out.push(span(seg.text));
      continue;
    }
    let c = 0;
    for (const m of itParts) {
      const idx = m.index ?? 0;
      if (idx > c) out.push(span(seg.text.slice(c, idx)));
      out.push(span(m[1], ['em']));
      c = idx + m[0].length;
    }
    if (c < seg.text.length) out.push(span(seg.text.slice(c)));
  }
  if (out.length === 0) out.push(span(''));
  return out;
}

function block(
  text: string,
  opts: {
    style?: Block['style'];
    listItem?: 'bullet' | 'number';
    level?: number;
  } = {},
): Block {
  return {
    _type: 'block',
    _key: k(),
    style: opts.style ?? 'normal',
    markDefs: [],
    children: inlineSpans(text),
    ...(opts.listItem
      ? { listItem: opts.listItem, level: opts.level ?? 1 }
      : {}),
  };
}

function p(text: string): Block {
  return block(text);
}

function bullet(text: string): Block {
  return block(text, { listItem: 'bullet', level: 1 });
}

function num(text: string): Block {
  return block(text, { listItem: 'number', level: 1 });
}

function h3(text: string): Block {
  return block(text, { style: 'h3' });
}

// ---- content ----------------------------------------------------------------

const indications: Block[] = [
  p(
    'Open carpal tunnel release is indicated for adults with carpal tunnel syndrome whose symptoms have not resolved with conservative measures, or whose presentation is severe enough that conservative measures are unlikely to succeed.',
  ),
  p('The clinical picture combines:'),
  bullet(
    'nocturnal numbness and paraesthesia in the median nerve distribution — the thumb, index, middle, and radial half of the ring finger;',
  ),
  bullet(
    'positive provocative findings on examination — Phalen test, Tinel sign, Durkan compression test;',
  ),
  bullet(
    'in more advanced disease, fixed sensory loss, weakness of thumb abduction, and visible thenar atrophy.',
  ),
  p(
    'A clinical diagnosis may be made using the CTS-6 criteria of Graham et al., which the 2024 American Academy of Orthopaedic Surgeons (AAOS) clinical practice guideline endorses as a stand-alone diagnostic instrument in cases without diagnostic uncertainty — that is, without atypical features, suspected polyneuropathy, or suspected cervical radiculopathy.¹,² Where the picture is ambiguous, nerve conduction studies remain useful for confirmation and for severity grading.³',
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
    'A trial of corticosteroid injection has a defined, narrow role: 80 mg methylprednisolone delays the time to surgery at five years compared with placebo, but does not produce durable symptom resolution and does not change the indication for definitive release once symptoms recur.⁴,⁵',
  ),
  p(
    'The 2024 AAOS guideline also withdraws the routine recommendation for postoperative supervised therapy and post-operative splinting on the basis of moderate evidence, and finds no long-term benefit of platelet-rich plasma in carpal tunnel syndrome.² Practice decisions on these adjuncts are addressed in § 08 Aftercare.',
  ),
];

const contraindications: Block[] = [
  p(
    'There are no specific anatomical contraindications to open release. General considerations apply:',
  ),
  bullet(
    '**Diagnostic uncertainty.** Symptoms that do not localise convincingly to the median nerve distribution warrant further work-up — cervical radiculopathy, pronator syndrome (proximal median compression), cubital tunnel syndrome, thoracic outlet syndrome, and small-fibre polyneuropathy may all mimic carpal tunnel syndrome.',
  ),
  bullet('**Untreated infection** at the operative site.'),
  bullet(
    '**Coagulopathy** or anticoagulation that cannot be safely managed peri-operatively.',
  ),
  bullet(
    '**Patient unable to cooperate** with awake surgery — in which case the operation is not contraindicated, but the anaesthetic plan adapts; regional or general anaesthesia is then used.',
  ),
  bullet(
    'In **complex regional pain syndrome** or active flare of inflammatory arthritis affecting the wrist, surgery is timed and planned in conjunction with the relevant specialist.',
  ),
];

const anatomy: Block[] = [
  p(
    "The carpal tunnel is a fibro-osseous canal at the wrist. Its floor is formed by the volar surfaces of the proximal carpal row; its walls are the scaphoid and trapezium radially and the pisiform and hook of hamate ulnarly; its roof is the transverse carpal ligament, the thickened central portion of the flexor retinaculum. The tunnel transmits ten structures: nine flexor tendons — four flexor digitorum superficialis, four flexor digitorum profundus, and flexor pollicis longus — and the median nerve.",
  ),
  p('Three nerve branches define the surgical risk zones:'),
  bullet(
    'the **palmar cutaneous branch of the median nerve** (PCBMN), which arises 4–6 cm proximal to the wrist crease, runs superficial to the flexor retinaculum, and supplies the skin of the thenar eminence;',
  ),
  bullet(
    'the **recurrent (thenar) motor branch of the median nerve**, with extraligamentous, subligamentous, and transligamentous variants described by Lanz, supplying abductor pollicis brevis, opponens pollicis, and the superficial head of flexor pollicis brevis;',
  ),
  bullet(
    'the **palmar cutaneous branch of the ulnar nerve**, which crosses the hypothenar fat at risk only with very ulnar incisions.',
  ),
  p(
    "The distal extent of safe dissection is bounded by the superficial palmar arch, which lies on average 6–11 mm distal to Kaplan's cardinal line — the line drawn from the apex of the first web space across the palm parallel to the proximal palmar crease.⁶,⁷ This is the practical reason a safe incision stops well proximal to Kaplan's line.",
  ),
];

const positioning: Block[] = [
  p(
    'The patient is supine, with the operative arm abducted on a hand table, forearm supinated, fingers and thumb gently extended. A non-sterile pneumatic upper-arm tourniquet is applied. Local infiltration is performed with lidocaine 1% (with or without epinephrine, surgeon preference) along the planned incision and into the carpal tunnel; tourniquet is inflated for the operative phase and deflated before closure for haemostasis. Skin marking is performed before infiltration, with the surgeon seated at the head of the hand table.',
  ),
  p(
    'WALANT (wide-awake local anaesthesia, no tourniquet — lidocaine with epinephrine, no tourniquet) is an alternative anaesthetic approach with strong evidence support in the 2024 AAOS guideline for carpal tunnel release.²,⁸ It is covered in detail on a separate page; this page describes the tourniquet-and-local-infiltration approach used in this practice.',
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
    'I do not perform routine internal neurolysis, epineurotomy, or flexor tenosynovectomy. None improves outcomes in primary carpal tunnel syndrome and they carry their own morbidity. They are reserved for specific intra-operative findings — rheumatoid synovitis, dialysis-related amyloid, an obvious mass — and the indication is decided on the table, not in advance.⁹,¹⁰',
  ),
];

const closure: Block[] = [
  p(
    'Skin closure is by interrupted simple sutures of 4-0 nylon. A non-circumferential soft bulky dressing is applied — a tight or restrictive wrist dressing is unnecessary and counter-productive.¹¹ Sutures are removed at 10–14 days.',
  ),
  p(
    'Trial-level evidence shows broadly equivalent long-term scar quality between interrupted non-absorbable closure and running subcuticular absorbable closure for carpal tunnel release wounds, with subcuticular absorbable closure delivering modestly better early scar appearance and avoiding suture-removal discomfort.¹¹,¹² The choice is surgeon-preference within that evidence base.',
  ),
];

const aftercare: Block[] = [
  p(
    'Immediate finger range of motion is encouraged; the operative hand is used for light pain-free activities from the first day. No splint is applied, and no post-operative immobilisation is recommended — the 2024 AAOS guideline rates the evidence for routine post-operative immobilisation as moderately against, on the basis that uncomplicated patients recover function more rapidly without it.²',
  ),
  p(
    'Routine referral to a hand therapist is made for all patients in this practice. The referral covers a single early consultation for graduated finger and wrist active range of motion, oedema management, scar management once the wound is healed, and structured guidance on return-to-work timing. The 2024 AAOS guideline rates the evidence for routine supervised therapy as moderately against on the basis that uncomplicated patients recover function without it; the rationale for routine referral here is the value of an early structured consultation in setting realistic expectations, identifying the minority of patients with developing pillar pain or stiffness, and supporting the return-to-work conversation — particularly for manual workers, for whom structured rehabilitation reduces uncertainty and protects against premature loading.',
  ),
  p('A practical timeline:'),
  bullet(
    '**Day 0–2.** Elevation when comfortable; finger flexion and extension exercises encouraged. Simple analgesia — paracetamol with NSAID — is recommended; AAOS rates this combination as supported by strong evidence.²',
  ),
  bullet(
    '**Day 1–7.** Light tasks of daily living. The dressing is kept dry. Most patients sleep through the night within the first few nights; relief of nocturnal paraesthesia is typically the first symptom to resolve.',
  ),
  bullet(
    '**Day 10–14.** Wound review and removal of sutures. Driving is reasonable once the patient can grip the steering wheel comfortably and operate controls — typically by 1–2 weeks.',
  ),
  bullet(
    '**Week 2–4.** Return to most desk-based and light manual work. Pooled literature gives mean return-to-activity around 13 days and return-to-work in the 2–3-week range, with manual work typically requiring 4–6 weeks.¹³',
  ),
  bullet(
    '**Month 1–3.** Pillar pain — discomfort at the thenar and hypothenar bases on direct pressure, distinct from the incision — affects a substantial minority of patients. Most cases resolve by 3–6 months.¹⁴',
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
    'Major complications of open carpal tunnel release — those requiring readmission or revision — sit below 1% in large series.¹⁵ Lesser complications are more common and are discussed with patients pre-operatively as a routine part of consent.',
  ),
  bullet(
    '**Persistent or recurrent symptoms.** Heterogeneous figures across the literature: 1–25% have some persistent or recurrent symptoms; revision is required in around 5% in large series, and approximately 3% have true recurrence after a symptom-free interval.⁹,¹⁶ The most common cause is incomplete division of the transverse carpal ligament or its proximal antebrachial-fascia continuation.',
  ),
  bullet(
    '**Pillar pain.** Reported in 13–49% of patients depending on definition and method of assessment; usually self-limiting by 3–6 months.¹⁴',
  ),
  bullet(
    '**Scar tenderness.** Reported in 7–61% of patients across older series; minimised by an in-line incision ulnar to the thenar crease and by careful skin closure.¹²',
  ),
  bullet(
    '**Palmar cutaneous branch injury.** Causes a tender neuroma or numb patch at the thenar base; minimised by keeping the proximal limit of the incision distal to the wrist crease and by staying ulnar to the thenar crease.¹⁷',
  ),
  bullet(
    '**Recurrent motor branch injury.** Rare but functionally significant; prevented by ulnar-side entry into the tunnel.',
  ),
  bullet(
    '**Median nerve injury.** Major nerve injury occurs in less than 0.5% of cases in published series.¹⁵',
  ),
  bullet(
    "**Superficial palmar arch injury.** Avoided by stopping the dissection well proximal to Kaplan's cardinal line.⁶",
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

// ---- assemble + send --------------------------------------------------------

const PROCEDURE_ID = 'e238943e-dc53-40ad-b02c-b4ba2ed07702';

async function main() {
  const res = await client
    .patch(PROCEDURE_ID)
    .set({
      title: 'Open Carpal Tunnel Release',
      audience: 'mixed',
      lastUpdated: '2026-05-02',
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
  console.log('Patched procedure:', res._id, 'rev:', res._rev);
}

main().catch((err: any) => {
  console.error('Patch failed:', err.message);
  process.exit(1);
});
