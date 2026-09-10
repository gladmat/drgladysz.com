// Trapeziometacarpal joint replacement (Touch® dual-mobility prosthesis) —
// operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  trapeziometacarpal-joint-replacement-touch.md
// Evidence note:   01-brand-system/operation-notes-package/evidence/
//                  touch-trapeziometacarpal-arthroplasty.md
//
// Elective cementless total joint replacement of the thumb CMC joint for
// Eaton–Littler stage II–III osteoarthritis. The implantation steps encode
// the published Touch® keypoints (dorsoradial approach protecting the
// superficial radial nerve branches and the radial artery; ≤5 mm metacarpal
// resection; canal opened centrally, not dorsal; guidewire perpendicular to
// the proximal articular surface of the trapezium in both planes, checked
// on the image intensifier before reaming; cup centred and parallel to that
// surface; neck chosen on tension — ½ to 1 head diameter of subluxation
// under traction — and on freedom from neck-on-cup impingement).
//
// Two safety rules shape the form:
//   1. Implant sizes and lot numbers are never defaulted. Every size select
//      starts at [__] and every lot at [________], so the implant record
//      cannot be pasted with a wrong size by accident.
//   2. Suture material drives the post-op removal bullet (operator closes with
//      Monocryl + Steri-Strips, so the default has nothing to remove); immobilisation
//      resolves at render time ('auto' → extended when an intra-operative
//      trapezial crack is recorded) — the v2.1 site-driven pattern, no
//      stored derived state.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, todayNZ } from './_shared/markdown';

type Anaesthesia = 'regional' | 'ga' | 'combined';
type AnaesthetistMode = 'auto' | 'present' | 'absent';
type Antibiotic = 'cefazolin2' | 'cefazolin3' | 'clindamycin' | 'custom';
type Side = 'unspecified' | 'left' | 'right';
type Stage = 'unspecified' | 'II' | 'III' | 'IV';
type Stt = 'auto' | 'preserved' | 'mild' | 'advanced';
type Injections = 'none' | 'one' | 'two';
type InjectionRelief = 'transient' | 'none';
type CupShape = 'spherical' | 'conical';
type CupSize = 'unspecified' | '9' | '10';
type NeckType = 'offset' | 'straight';
type NeckLength = 'unspecified' | '6' | '8' | '10';
type StemSize = 'unspecified' | '1' | '2' | '3' | '4' | '5' | '6';
type Capsule = 'repair' | 'resect';
type McpProcedure = 'none' | 'capsulodesis' | 'kwire';
type BoneQuality = 'good' | 'osteopenic';
type Closure = 'monocryl4' | 'monocryl3' | 'nylon' | 'pronova';
type Immobilisation = 'auto' | 'standard' | 'extended' | 'early';

interface State {
  date: string;
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  anaesthetistMode: AnaesthetistMode;
  anaesthesia: Anaesthesia;
  antibiotic: Antibiotic;
  antibioticCustom: string;
  tourniquetPressure: string;
  tourniquetOn: string;
  tourniquetOff: string;
  tourniquetTime: string;
  side: Side;
  stage: Stage;
  symptomMonths: string;
  keyPinch: string;
  keyPinchContra: string;
  mcpHyperextension: string;
  stt: Stt;
  orthosisMonths: string;
  injections: Injections;
  injectionRelief: InjectionRelief;
  acc: boolean;
  accNumber: string;
  cupShape: CupShape;
  cupSize: CupSize;
  cupLot: string;
  neckType: NeckType;
  neckLength: NeckLength;
  neckLot: string;
  stemSize: StemSize;
  stemLot: string;
  capsule: Capsule;
  resectionMm: string;
  mcpProcedure: McpProcedure;
  histology: boolean;
  trapezialCrack: boolean;
  subluxation: boolean;
  boneQuality: BoneQuality;
  additionalFindings: string;
  closure: Closure;
  immobilisation: Immobilisation;
  screeningTime: string;
  doseAreaProduct: string;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  anaesthetistMode: 'auto',
  anaesthesia: 'regional',
  antibiotic: 'cefazolin2',
  antibioticCustom: '[Agent, dose] IV',
  tourniquetPressure: '250',
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  side: 'unspecified',
  stage: 'unspecified',
  symptomMonths: '[___]',
  keyPinch: '[___]',
  keyPinchContra: '[___]',
  mcpHyperextension: '[___]',
  stt: 'auto',
  orthosisMonths: '[___]',
  injections: 'none',
  injectionRelief: 'transient',
  acc: false,
  accNumber: '[#########]',
  cupShape: 'spherical',
  cupSize: 'unspecified',
  cupLot: '[________]',
  neckType: 'offset',
  neckLength: 'unspecified',
  neckLot: '[________]',
  stemSize: 'unspecified',
  stemLot: '[________]',
  capsule: 'resect',
  resectionMm: '[___]',
  mcpProcedure: 'none',
  histology: false,
  trapezialCrack: false,
  subluxation: true,
  boneQuality: 'good',
  additionalFindings: '',
  closure: 'monocryl4',
  immobilisation: 'auto',
  screeningTime: '[___]',
  doseAreaProduct: '[___]',
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL: Record<Anaesthesia, string> = {
  regional: 'Brachial plexus block + tourniquet',
  ga: 'GA + tourniquet',
  combined: 'GA + brachial plexus block + tourniquet',
};

const ANAESTHESIA_SENTENCE: Record<Anaesthesia, string> = {
  regional: 'Brachial plexus block (anaesthetist).',
  ga: 'General anaesthesia.',
  combined:
    'General anaesthesia with brachial plexus block for post-operative analgesia.',
};

const ANTIBIOTIC_LABEL: Record<Antibiotic, string> = {
  cefazolin2: 'Cefazolin 2 g IV (default)',
  cefazolin3: 'Cefazolin 3 g IV (≥120 kg)',
  clindamycin: 'Clindamycin 600 mg IV (β-lactam anaphylaxis)',
  custom: 'Custom',
};

const SIDE_LABEL: Record<Side, string> = {
  unspecified: '[SIDE]',
  left: 'Left',
  right: 'Right',
};

const STAGE_LABEL: Record<Stage, string> = {
  unspecified: '[STAGE]',
  II: 'II',
  III: 'III',
  IV: 'IV',
};

type ResolvedStt = Exclude<Stt, 'auto'>;

// Stage IV is defined by scaphotrapeziotrapezoid involvement, so the STT
// status follows the stage unless the surgeon overrides it: stage IV →
// advanced change accepted, anything else → preserved.
function resolveStt(s: State): ResolvedStt {
  if (s.stt !== 'auto') return s.stt;
  return s.stage === 'IV' ? 'advanced' : 'preserved';
}

const STT_LABEL: Record<ResolvedStt, string> = {
  preserved: 'Preserved',
  mild: 'Mild changes, accepted',
  advanced: 'STT osteoarthritis (stage IV), accepted',
};

const STT_DIAGNOSIS: Record<ResolvedStt, string> = {
  preserved: 'scaphotrapeziotrapezoid joint preserved.',
  mild: 'mild scaphotrapeziotrapezoid changes accepted, asymptomatic on examination.',
  advanced:
    'scaphotrapeziotrapezoid osteoarthritis (stage IV) accepted — pain and tenderness localised to the trapeziometacarpal joint on examination.',
};

const STT_FINDING: Record<ResolvedStt, string> = {
  preserved: 'Scaphotrapeziotrapezoid joint: preserved.',
  mild: 'Scaphotrapeziotrapezoid joint: mild degenerative change, accepted.',
  advanced:
    'Scaphotrapeziotrapezoid joint: degenerative change consistent with stage IV disease, accepted and not addressed.',
};

const NECK_TYPE_PHRASE: Record<NeckType, string> = {
  offset: '15° offset',
  straight: 'straight',
};

// Operator's practice: absorbable subcuticular Monocryl + Steri-Strips, 4-0
// for thin skin and 3-0 for thicker skin. Non-absorbable options are kept
// for the case where the surgeon wants removable sutures.
const CLOSURE_STEP: Record<Closure, string> = {
  monocryl4:
    'Skin closed with 4-0 Monocryl subcuticular running; Steri-Strips applied.',
  monocryl3:
    'Skin closed with 3-0 Monocryl subcuticular running; Steri-Strips applied.',
  nylon: 'Skin closed with 4-0 nylon interrupted.',
  pronova: 'Skin closed with 3-0 Pronova interrupted mattress sutures.',
};

const CLOSURE_LABEL: Record<Closure, string> = {
  monocryl4: '4-0 Monocryl subcuticular + Steri-Strips',
  monocryl3: '3-0 Monocryl subcuticular + Steri-Strips (thicker skin)',
  nylon: '4-0 nylon interrupted',
  pronova: '3-0 Pronova mattress',
};

const ABSORBABLE_POSTOP =
  'Absorbable subcuticular closure — no sutures to remove; wound check and Steri-Strip removal at 10–14 days.';

const CLOSURE_POSTOP: Record<Closure, string> = {
  monocryl4: ABSORBABLE_POSTOP,
  monocryl3: ABSORBABLE_POSTOP,
  nylon: 'Sutures out at 10–14 days.',
  pronova: 'Sutures out at 10–14 days.',
};

type ResolvedImmobilisation = Exclude<Immobilisation, 'auto'>;

const IMMOBILISATION_LABEL: Record<ResolvedImmobilisation, string> = {
  standard: 'Standard — back-slab to wound review, then orthosis 2 weeks',
  extended: 'Extended — back-slab 2 weeks, then orthosis 4 weeks',
  early: 'Early mobilisation — bulky dressing 7–10 days, no splint',
};

// Immobilisation follows the bone, not the surgeon's habit: a recorded
// intra-operative trapezial crack resolves 'auto' to the extended regimen.
function resolveImmobilisation(s: State): ResolvedImmobilisation {
  if (s.immobilisation !== 'auto') return s.immobilisation;
  return s.trapezialCrack ? 'extended' : 'standard';
}

const DRESSING_STEP: Record<ResolvedImmobilisation, string> = {
  standard:
    'Non-adherent dressing, wool and crepe; well-padded thumb spica plaster-of-Paris back-slab in palmar abduction with the interphalangeal joint free.',
  extended:
    'Non-adherent dressing, wool and crepe; well-padded thumb spica plaster-of-Paris back-slab in palmar abduction with the interphalangeal joint free.',
  early:
    'Non-adherent dressing and a bulky, soft, non-circumferential wool and crepe dressing; no splint.',
};

const SPLINT_POSTOP: Record<ResolvedImmobilisation, string> = {
  standard:
    'Thumb spica back-slab until wound review at 10–14 days, then hand therapy: removable thermoplastic thumb orthosis for a further 2 weeks, active thumb range of motion and opposition out of the orthosis, gradual pinch and grip strengthening from 6 weeks.',
  extended:
    'Thumb spica back-slab for 2 weeks, then hand therapy: removable thermoplastic thumb orthosis for a further 4 weeks with active thumb range of motion and opposition out of the orthosis from week 3; gradual pinch and grip strengthening from 6 weeks.',
  early:
    'Bulky dressing reduced at 7–10 days; no splint. Hand therapy from the first week: active thumb range of motion and opposition, gradual pinch and grip strengthening from 6 weeks.',
};

const DRIVING_POSTOP: Record<ResolvedImmobilisation, string> = {
  standard:
    'Driving from 4 weeks once out of the orthosis with a comfortable grip. Desk work 2–3 weeks; manual work 6–8 weeks.',
  extended:
    'Driving from 6 weeks once out of the orthosis with a comfortable grip. Desk work 2–3 weeks; manual work 8–12 weeks.',
  early:
    'Driving from 2 weeks once able to grip the wheel comfortably. Desk work 2–3 weeks; manual work 6–8 weeks.',
};

function anaesthetistPresent(s: State): boolean {
  if (s.anaesthetistMode !== 'auto') return s.anaesthetistMode === 'present';
  return true; // block, GA and combined all involve an anaesthetist
}

function sizeOrPlaceholder(value: string): string {
  return value === 'unspecified' ? '[__]' : value;
}

function antibioticLine(s: State): string {
  const agent =
    s.antibiotic === 'cefazolin2'
      ? 'Cefazolin 2 g IV'
      : s.antibiotic === 'cefazolin3'
        ? 'Cefazolin 3 g IV (≥120 kg)'
        : s.antibiotic === 'clindamycin'
          ? 'Clindamycin 600 mg IV (β-lactam anaphylaxis)'
          : s.antibioticCustom;
  const weightNote = s.antibiotic === 'cefazolin2' ? ' (3 g if ≥120 kg)' : '';
  return `${agent}, infusion completed before tourniquet inflation${weightNote}; single dose, no post-operative antibiotics. VTE: mechanical measures only — day-case upper-limb procedure with immediate mobilisation; pharmacological prophylaxis not indicated.`;
}

function diagnosisLines(s: State): string[] {
  const sttSentence = STT_DIAGNOSIS[resolveStt(s)];
  const injection =
    s.injections === 'none'
      ? 'no steroid injection'
      : `steroid injection ×${s.injections === 'one' ? '1' : '2'} with ${s.injectionRelief === 'transient' ? 'transient' : 'no'} relief`;
  return [
    `${SIDE_LABEL[s.side]} trapeziometacarpal (CMC1) osteoarthritis, Eaton–Littler stage ${STAGE_LABEL[s.stage]} — pain at the base of the thumb with pinch and grip for ${s.symptomMonths} months; grind test positive. Key pinch ${s.keyPinch} kg (contralateral ${s.keyPinchContra} kg). MCP joint hyperextension ${s.mcpHyperextension}°.`,
    `Radiographs (Robert's and lateral views): joint-space loss, subchondral sclerosis and marginal osteophytes at the trapeziometacarpal joint; ${sttSentence} Trapezial height and bone stock adequate for a press-fit cup.`,
    `Conservative management failed: activity modification, thumb orthosis and hand therapy for ${s.orthosisMonths} months; NSAIDs; ${injection}.`,
    `Total joint replacement chosen over trapeziectomy for earlier recovery of pinch strength and preservation of thumb length; conversion to trapeziectomy remains available should the implant fail.`,
  ];
}

function consentParagraph(s: State): string {
  const stageIv =
    s.stage === 'IV'
      ? ' Use of the prosthesis in stage IV disease — outside the manufacturer\'s labelled indication of stage II–III — and the possibility of persistent scaphotrapeziotrapezoid pain discussed.'
      : '';
  return `Risks discussed: bleeding, infection (including deep infection requiring implant removal), numbness or neuroma from the superficial branch of the radial nerve, radial artery injury, intra-operative trapezial fracture with conversion to trapeziectomy, dislocation, impingement, loosening or wear of the implant requiring revision, de Quervain-type tendon irritation, stiffness, persistent pain, CRPS, need for further surgery. Alternatives (continued non-operative care, trapeziectomy with or without suspension, arthrodesis) discussed.${stageIv} Implant details will be recorded in the clinical record and given to the patient. Written consent obtained.`;
}

function positionLine(s: State): string {
  return `Supine, arm on hand table, forearm pronated with the thumb uppermost. ${ANAESTHESIA_SENTENCE[s.anaesthesia]} Image intensifier positioned and draped; implant sizes templated on the pre-operative Robert's view. Upper arm tourniquet ${s.tourniquetPressure} mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`;
}

function procedureSteps(s: State): string[] {
  const cup = sizeOrPlaceholder(s.cupSize);
  const neck = sizeOrPlaceholder(s.neckLength);
  const stem = sizeOrPlaceholder(s.stemSize);
  const neckType = NECK_TYPE_PHRASE[s.neckType];
  const immobilisation = resolveImmobilisation(s);

  const capsulotomy =
    s.capsule === 'repair'
      ? `Interval between abductor pollicis longus and extensor pollicis brevis developed; APL insertion preserved. Longitudinal capsulotomy with subperiosteal elevation of dorsal and volar capsular flaps off the trapezium and the metacarpal base, preserved for repair.`
      : `Interval between abductor pollicis longus and extensor pollicis brevis developed; APL insertion preserved. Longitudinal capsulotomy and complete capsulectomy; capsule not preserved.`;

  const closureDeep =
    s.capsule === 'repair'
      ? `Tourniquet down; haemostasis with bipolar diathermy; saline irrigation. Capsular flaps repaired over the prosthesis with 3-0 Vicryl interrupted; APL–EPB interval reapproximated. No drain.`
      : `Tourniquet down; haemostasis with bipolar diathermy; saline irrigation. No capsular or deep-layer closure; no drain.`;

  const mcpStep =
    s.mcpProcedure === 'capsulodesis'
      ? `MCP joint volar plate capsulodesis through a separate volar incision for hyperextension: volar plate advanced and fixed to the metacarpal neck with a suture anchor, MCP joint held in 20° flexion.`
      : s.mcpProcedure === 'kwire'
        ? `MCP joint pinned in 20° flexion with a 1.2 mm K-wire across the joint for hyperextension; wire cut and buried beneath the skin.`
        : '';

  return [
    `Dorsoradial longitudinal incision 4–5 cm centred on the trapeziometacarpal joint, in line with the extensor pollicis brevis tendon. Branches of the superficial radial nerve identified, mobilised and protected throughout; radial artery identified proximally over the trapezium and retracted.`,
    capsulotomy,
    `Joint released — capsule circumferentially, intermetacarpal ligament, volar beak of the metacarpal base and all marginal osteophytes on the metacarpal and the trapezium; scaphotrapeziotrapezoid joint inspected.`,
    `Metacarpal base delivered by flexion and adduction of the thumb. Osteotomy of the articular surface with an oscillating saw through the cutting guide, perpendicular to the metacarpal axis, resecting ${s.resectionMm} mm (5 mm maximum). Canal opened centrally with the awl in the axis of the shaft — not dorsal — and broached sequentially to size ${stem} with rotational stability.`,
    `Trapezium: articular surface and osteophytes debrided; centre of the distal articular surface identified at the intersection of the dorsopalmar and radioulnar diameters. Guidewire inserted at the centre, perpendicular to the proximal articular surface of the trapezium in both the lateral and the dorsopalmar plane; position confirmed on image intensifier before reaming.`,
    `Cannulated reaming over the guidewire — starter, then Ø ${cup} mm reamer — to a depth that preserves the subchondral bone of the scaphotrapeziotrapezoid surface; trapezial walls checked circumferentially and intact. Trial cup seated and stable.`,
    `Definitive ${s.cupShape} cup Ø ${cup} mm impacted press-fit — centred on the distal trapezial surface and parallel to the proximal articular surface, stable to rotation and pull-out; seating confirmed on image intensifier.`,
    `Trial reduction with the trial stem and trial necks: ${neckType} neck, length ${neck} mm, selected on tension — ½ to 1 head diameter of subluxation under longitudinal traction — with full flexion–extension, abduction–adduction, opposition and retropulsion free of neck-on-cup impingement, no subluxation on axial compression and circumduction, and tenodesis balance of the thumb ray restored.`,
    `Definitive stem size ${stem} impacted in the axis of the canal; definitive ${neckType} neck ${neck} mm with pre-assembled polyethylene liner seated on the taper with the impactor; joint reduced. Range of motion, stability and absence of impingement re-confirmed.`,
    `Image intensifier: posteroanterior and lateral views saved to PACS — cup centred in the trapezium and parallel to its proximal articular surface, stem in the axis of the metacarpal, joint reduced, no fracture.`,
    mcpStep,
    closureDeep,
    CLOSURE_STEP[s.closure],
    DRESSING_STEP[immobilisation],
  ];
}

function implantLines(s: State): string[] {
  return [
    `Trapezial cup: ${s.cupShape}, Ø ${sizeOrPlaceholder(s.cupSize)} mm — stainless steel, plasma-sprayed titanium + hydroxyapatite coating — LOT ${s.cupLot}`,
    `Neck with pre-assembled liner: ${NECK_TYPE_PHRASE[s.neckType]}, length ${sizeOrPlaceholder(s.neckLength)} mm — stainless steel, highly cross-linked UHMWPE liner — LOT ${s.neckLot}`,
    `Metacarpal stem: size ${sizeOrPlaceholder(s.stemSize)} — titanium alloy, plasma-sprayed titanium + hydroxyapatite coating — LOT ${s.stemLot}`,
  ];
}

function findingsLines(s: State): string[] {
  const subluxation = s.subluxation
    ? ', dorsoradial subluxation of the metacarpal base'
    : '';
  const bone =
    s.boneQuality === 'good'
      ? 'adequate height and good cancellous bone quality'
      : 'adequate height but osteopenic cancellous bone';
  const trapezium = s.trapezialCrack
    ? `Trapezium: ${bone}; non-displaced crack of the trapezial wall on cup impaction — cup remained stable to rotation and pull-out, no displacement on image intensifier; immobilisation extended.`
    : `Trapezium: ${bone}; no intra-operative fracture.`;
  const stt = STT_FINDING[resolveStt(s)];
  const mcp =
    s.mcpProcedure === 'none'
      ? `MCP joint hyperextension ${s.mcpHyperextension}° pre-operatively; realigned passively once the thumb ray was restored — no additional procedure.`
      : s.mcpProcedure === 'capsulodesis'
        ? `MCP joint hyperextension ${s.mcpHyperextension}° pre-operatively; persisted after realignment of the thumb ray — treated with volar plate capsulodesis.`
        : `MCP joint hyperextension ${s.mcpHyperextension}° pre-operatively; persisted after realignment of the thumb ray — held with a temporary K-wire.`;
  const lines = [
    `Eaton–Littler stage ${STAGE_LABEL[s.stage]} trapeziometacarpal osteoarthritis: full-thickness cartilage loss on the trapezium and the metacarpal base, marginal osteophytes${subluxation}.`,
    `${trapezium} ${stt}`,
    mcp,
    `Final construct stable through the full range of motion with no impingement.`,
  ];
  const extra = s.additionalFindings.trim();
  if (extra) lines.push(extra);
  return lines;
}

function postOpLines(s: State): string[] {
  const immobilisation = resolveImmobilisation(s);
  return [
    `Day case; elevation for 48 h; neurovascular observations before discharge; finger and interphalangeal joint motion from day 1.`,
    `Analgesia: paracetamol + NSAID regularly for 5–7 days; tramadol rescue for up to 3 days. No further antibiotics.`,
    SPLINT_POSTOP[immobilisation],
    CLOSURE_POSTOP[s.closure],
    s.mcpProcedure === 'kwire' && `MCP joint K-wire removed in clinic at 4 weeks.`,
    `No forceful pinch, lifting over 1 kg or heavy manual loading for 6 weeks; unrestricted loading from 6 weeks.`,
    `Return advice: sudden deformity or loss of thumb movement (dislocation), increasing pain, redness or discharge (infection) — present the same day.`,
    `First-compartment (de Quervain-type) irritation occurs in a minority in the first months — early hand-therapy review; steroid injection if persistent.`,
    DRIVING_POSTOP[immobilisation],
    `Radiographs (posteroanterior and lateral) at 6 weeks, 1 year and 5 years for implant surveillance, then as indicated.`,
    `Implant card completed and given to the patient; implant labels in the clinical record.`,
    s.acc && `ACC claim lodged.`,
    s.histology && `Histology to be reviewed at clinic.`,
    `Clinic review at 2 weeks, 6 weeks (with radiographs), 3 months and 1 year.`,
  ].filter((l): l is string => Boolean(l));
}

function renderMarkdown(s: State): string {
  const anaesthetic = ANAESTHESIA_LABEL[s.anaesthesia];
  return joinSections(
    `# OPERATION NOTE — Trapeziometacarpal joint replacement (Touch® dual-mobility prosthesis)`,
    [
      `Date: ${s.date}    Elective`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      anaesthetistPresent(s)
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${anaesthetic}`
        : `Anaesthetic: ${anaesthetic}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed; implant availability and templated sizes confirmed at Time-out.`,
      s.acc && `ACC45 #: ${s.accNumber} — post-traumatic osteoarthritis (accepted claim).`,
    ]
      .filter(Boolean)
      .join('\n'),
    `## Diagnosis / Indication`,
    bullets(diagnosisLines(s)),
    `## Consent`,
    consentParagraph(s),
    `## Position / Anaesthesia / Tourniquet`,
    positionLine(s),
    `## Antibiotics / VTE prophylaxis`,
    antibioticLine(s),
    `## Procedure — Trapeziometacarpal joint replacement, Touch® dual-mobility prosthesis`,
    numbered(procedureSteps(s)),
    `## Implants`,
    `KeriMedical Touch® dual-mobility trapeziometacarpal prosthesis (Keri Medical SA, Plan-les-Ouates, Switzerland) — cementless, press-fit; Medsafe WAND-notified device. Implant labels affixed to the implant record; REF / LOT / UDI recorded.`,
    bullets(implantLines(s)),
    `## Specimens`,
    s.histology
      ? `Resected metacarpal base — histology; trapezial reamings discarded.`
      : `Nil for histology — resected metacarpal base and trapezial reamings discarded.`,
    `## Findings`,
    bullets(findingsLines(s)),
    `## Imaging`,
    `Image intensifier used — screening time ${s.screeningTime} s, dose-area product ${s.doseAreaProduct} cGy·cm²; recorded per departmental radiation-safety protocol.`,
    `## Estimated blood loss`,
    `<20 mL.`,
    `## Complications`,
    s.trapezialCrack
      ? `Non-displaced intra-operative trapezial crack — cup stable, managed with extended immobilisation (see Findings).`
      : `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets(postOpLines(s)),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function TrapeziometacarpalJointReplacementTouch() {
  const [state, setState] = useState<State>(() => ({
    ...INITIAL_STATE,
    date: todayNZ(),
    signatureDate: todayNZ(),
  }));
  const update = useCallback(
    <K extends keyof State>(key: K, value: State[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );
  const reset = useCallback(
    () =>
      setState({ ...INITIAL_STATE, date: todayNZ(), signatureDate: todayNZ() }),
    [],
  );

  const present = anaesthetistPresent(state);
  const resolvedImmobilisation = resolveImmobilisation(state);

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="trapeziometacarpal-joint-replacement-touch"
      formTitle="Inputs"
    >
      <div class="opnote-section">
        <p class="opnote-section-title">Header</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Date of op</span>
          <input class="opnote-field-input" type="text" value={state.date}
            onInput={(e) => update('date', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.hasAssistant}
            onChange={(e) => update('hasAssistant', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Assistant present (uncheck for solo procedures)</span>
        </label>
        {state.hasAssistant && (
          <label class="opnote-field">
            <span class="opnote-field-label">Assistant</span>
            <input class="opnote-field-input" type="text" value={state.assistant}
              onInput={(e) => update('assistant', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.acc}
            onChange={(e) => update('acc', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">ACC claim (post-traumatic osteoarthritis)</span>
        </label>
        {state.acc && (
          <label class="opnote-field">
            <span class="opnote-field-label">ACC45 number</span>
            <input class="opnote-field-input" type="text" value={state.accNumber}
              onInput={(e) => update('accNumber', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Diagnosis</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Side</span>
            <select class="opnote-field-select" value={state.side}
              onChange={(e) => update('side', (e.currentTarget as HTMLSelectElement).value as Side)}>
              <option value="unspecified">[SIDE]</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Eaton–Littler stage</span>
            <select class="opnote-field-select" value={state.stage}
              onChange={(e) => update('stage', (e.currentTarget as HTMLSelectElement).value as Stage)}>
              <option value="unspecified">[STAGE]</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
            <span class="opnote-field-hint">Labelled indication is stage II–III. Stage IV (STT involvement) resolves the STT status to "accepted" and adds the off-label sentence to Consent.</span>
          </label>
        </div>
        <div class="opnote-row opnote-row-3">
          <label class="opnote-field">
            <span class="opnote-field-label">Symptoms (months)</span>
            <input class="opnote-field-input" type="text" value={state.symptomMonths}
              onInput={(e) => update('symptomMonths', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Key pinch (kg)</span>
            <input class="opnote-field-input" type="text" value={state.keyPinch}
              onInput={(e) => update('keyPinch', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Contralateral (kg)</span>
            <input class="opnote-field-input" type="text" value={state.keyPinchContra}
              onInput={(e) => update('keyPinchContra', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">MCP hyperextension (°)</span>
            <input class="opnote-field-input" type="text" value={state.mcpHyperextension}
              onInput={(e) => update('mcpHyperextension', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">STT joint</span>
            <select class="opnote-field-select" value={state.stt}
              onChange={(e) => update('stt', (e.currentTarget as HTMLSelectElement).value as Stt)}>
              <option value="auto">Auto — follows stage ({STT_LABEL[resolveStt(state)]})</option>
              <option value="preserved">{STT_LABEL.preserved}</option>
              <option value="mild">{STT_LABEL.mild}</option>
              <option value="advanced">{STT_LABEL.advanced}</option>
            </select>
          </label>
        </div>
        <div class="opnote-row opnote-row-2" style="margin-top:12px">
          <label class="opnote-field">
            <span class="opnote-field-label">Orthosis + hand therapy (months)</span>
            <input class="opnote-field-input" type="text" value={state.orthosisMonths}
              onInput={(e) => update('orthosisMonths', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Steroid injections</span>
            <select class="opnote-field-select" value={state.injections}
              onChange={(e) => update('injections', (e.currentTarget as HTMLSelectElement).value as Injections)}>
              <option value="none">None</option>
              <option value="one">×1</option>
              <option value="two">×2</option>
            </select>
          </label>
        </div>
        {state.injections !== 'none' && (
          <label class="opnote-field">
            <span class="opnote-field-label">Response to injection</span>
            <select class="opnote-field-select" value={state.injectionRelief}
              onChange={(e) => update('injectionRelief', (e.currentTarget as HTMLSelectElement).value as InjectionRelief)}>
              <option value="transient">Transient relief</option>
              <option value="none">No relief</option>
            </select>
          </label>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Anaesthesia</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Anaesthetic</span>
          <div class="opnote-radio-group" role="radiogroup" aria-label="Anaesthetic">
            {(['regional', 'ga', 'combined'] as const).map((v) => (
              <label class="opnote-radio" key={v}>
                <input type="radio" name="anaesthesia" value={v} checked={state.anaesthesia === v}
                  onChange={() => update('anaesthesia', v)} />
                <span>{ANAESTHESIA_LABEL[v]}</span>
              </label>
            ))}
          </div>
        </div>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Anaesthetist line</span>
          <select class="opnote-field-select" value={state.anaesthetistMode}
            onChange={(e) => update('anaesthetistMode', (e.currentTarget as HTMLSelectElement).value as AnaesthetistMode)}>
            <option value="auto">Auto — follows anaesthetic ({present ? 'present' : 'omitted'})</option>
            <option value="present">Present</option>
            <option value="absent">Omitted</option>
          </select>
        </label>
        {present && (
          <label class="opnote-field">
            <span class="opnote-field-label">Anaesthetist</span>
            <input class="opnote-field-input" type="text" value={state.anaesthetist}
              onInput={(e) => update('anaesthetist', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Prophylactic antibiotic</span>
          <select class="opnote-field-select" value={state.antibiotic}
            onChange={(e) => update('antibiotic', (e.currentTarget as HTMLSelectElement).value as Antibiotic)}>
            {(['cefazolin2', 'cefazolin3', 'clindamycin', 'custom'] as const).map((v) => (
              <option value={v} key={v}>{ANTIBIOTIC_LABEL[v]}</option>
            ))}
          </select>
          <span class="opnote-field-hint">Implant surgery — prophylaxis always given. HQSC NZ guideline: cefazolin 2 g, 3 g at ≥120 kg, within 60 min of incision and complete before the tourniquet goes up; clindamycin 600 mg for β-lactam anaphylaxis.</span>
        </label>
        {state.antibiotic === 'custom' && (
          <label class="opnote-field">
            <span class="opnote-field-label">Agent and dose</span>
            <input class="opnote-field-input" type="text" value={state.antibioticCustom}
              onInput={(e) => update('antibioticCustom', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Tourniquet</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Pressure (mmHg)</span>
            <input class="opnote-field-input" type="text" value={state.tourniquetPressure}
              onInput={(e) => update('tourniquetPressure', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Total (min)</span>
            <input class="opnote-field-input" type="text" value={state.tourniquetTime}
              onInput={(e) => update('tourniquetTime', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">On (HH:MM)</span>
            <input class="opnote-field-input" type="text" value={state.tourniquetOn}
              onInput={(e) => update('tourniquetOn', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Off (HH:MM)</span>
            <input class="opnote-field-input" type="text" value={state.tourniquetOff}
              onInput={(e) => update('tourniquetOff', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Implants</p>
        <span class="opnote-field-hint">Sizes and lot numbers are never pre-filled — transcribe them from the implant labels.</span>
        <div class="opnote-subsection">
          <p class="opnote-subsection-title">Trapezial cup</p>
          <div class="opnote-row opnote-row-2">
            <label class="opnote-field">
              <span class="opnote-field-label">Shape</span>
              <select class="opnote-field-select" value={state.cupShape}
                onChange={(e) => update('cupShape', (e.currentTarget as HTMLSelectElement).value as CupShape)}>
                <option value="spherical">Spherical</option>
                <option value="conical">Conical</option>
              </select>
            </label>
            <label class="opnote-field">
              <span class="opnote-field-label">Diameter (mm)</span>
              <select class="opnote-field-select" value={state.cupSize}
                onChange={(e) => update('cupSize', (e.currentTarget as HTMLSelectElement).value as CupSize)}>
                <option value="unspecified">[__]</option>
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </label>
          </div>
          <label class="opnote-field">
            <span class="opnote-field-label">Cup LOT</span>
            <input class="opnote-field-input" type="text" value={state.cupLot}
              onInput={(e) => update('cupLot', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-subsection">
          <p class="opnote-subsection-title">Neck (liner pre-assembled)</p>
          <div class="opnote-row opnote-row-2">
            <label class="opnote-field">
              <span class="opnote-field-label">Type</span>
              <select class="opnote-field-select" value={state.neckType}
                onChange={(e) => update('neckType', (e.currentTarget as HTMLSelectElement).value as NeckType)}>
                <option value="offset">15° offset</option>
                <option value="straight">Straight (0°)</option>
              </select>
              <span class="opnote-field-hint">Offset is the usual choice; switch to straight if the offset neck impinges on the cup rim in flexion–extension.</span>
            </label>
            <label class="opnote-field">
              <span class="opnote-field-label">Length (mm)</span>
              <select class="opnote-field-select" value={state.neckLength}
                onChange={(e) => update('neckLength', (e.currentTarget as HTMLSelectElement).value as NeckLength)}>
                <option value="unspecified">[__]</option>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </label>
          </div>
          <label class="opnote-field">
            <span class="opnote-field-label">Neck LOT</span>
            <input class="opnote-field-input" type="text" value={state.neckLot}
              onInput={(e) => update('neckLot', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-subsection">
          <p class="opnote-subsection-title">Metacarpal stem</p>
          <div class="opnote-row opnote-row-2">
            <label class="opnote-field">
              <span class="opnote-field-label">Size</span>
              <select class="opnote-field-select" value={state.stemSize}
                onChange={(e) => update('stemSize', (e.currentTarget as HTMLSelectElement).value as StemSize)}>
                <option value="unspecified">[__]</option>
                {(['1', '2', '3', '4', '5', '6'] as const).map((v) => (
                  <option value={v} key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label class="opnote-field">
              <span class="opnote-field-label">Stem LOT</span>
              <input class="opnote-field-input" type="text" value={state.stemLot}
                onInput={(e) => update('stemLot', (e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Technique</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Capsule</span>
          <select class="opnote-field-select" value={state.capsule}
            onChange={(e) => update('capsule', (e.currentTarget as HTMLSelectElement).value as Capsule)}>
            <option value="resect">Complete capsulectomy — nothing closed but skin</option>
            <option value="repair">Flaps preserved and repaired over the prosthesis</option>
          </select>
          <span class="opnote-field-hint">Capsule resection and repair give the same pain, function and complication rates at 1 year (Schulthess, 188 patients).</span>
        </label>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Metacarpal resection (mm)</span>
          <input class="opnote-field-input" type="text" value={state.resectionMm}
            onInput={(e) => update('resectionMm', (e.currentTarget as HTMLInputElement).value)} />
          <span class="opnote-field-hint">5 mm maximum — over-resection lengthens the neck and over-tensions the thumb ray.</span>
        </label>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">MCP joint hyperextension</span>
          <select class="opnote-field-select" value={state.mcpProcedure}
            onChange={(e) => update('mcpProcedure', (e.currentTarget as HTMLSelectElement).value as McpProcedure)}>
            <option value="none">No additional procedure — realigns with the thumb ray</option>
            <option value="capsulodesis">Volar plate capsulodesis</option>
            <option value="kwire">Temporary K-wire in 20° flexion (4 weeks)</option>
          </select>
          <span class="opnote-field-hint">Hyperextension up to about 35° corrects with the arthroplasty alone; address the MCP joint only when it persists after realignment.</span>
        </label>
        <label class="opnote-toggle" style="margin-top:12px">
          <input type="checkbox" checked={state.histology}
            onChange={(e) => update('histology', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Resected metacarpal base to histology</span>
        </label>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.trapezialCrack}
            onChange={(e) => update('trapezialCrack', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Non-displaced intra-operative trapezial crack, cup stable (extends immobilisation)</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Findings</p>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.subluxation}
            onChange={(e) => update('subluxation', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Dorsoradial subluxation of the metacarpal base</span>
        </label>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Trapezial bone quality</span>
          <select class="opnote-field-select" value={state.boneQuality}
            onChange={(e) => update('boneQuality', (e.currentTarget as HTMLSelectElement).value as BoneQuality)}>
            <option value="good">Good cancellous bone</option>
            <option value="osteopenic">Osteopenic</option>
          </select>
        </label>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Additional findings (optional)</span>
          <textarea class="opnote-field-textarea" value={state.additionalFindings}
            onInput={(e) => update('additionalFindings', (e.currentTarget as HTMLTextAreaElement).value)} />
          <span class="opnote-field-hint">Emitted as a further bullet under Findings when non-empty.</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Closure and immobilisation</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Skin closure</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Skin closure">
            {(['monocryl4', 'monocryl3', 'nylon', 'pronova'] as const).map((v) => (
              <label class="opnote-radio" key={v}>
                <input type="radio" name="closure" value={v} checked={state.closure === v}
                  onChange={() => update('closure', v)} />
                <span>{CLOSURE_LABEL[v]}</span>
              </label>
            ))}
          </div>
          <span class="opnote-field-hint">Monocryl gauge follows skin thickness. Non-absorbable closure adds the suture-removal bullet to the post-op plan.</span>
        </div>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Immobilisation</span>
          <select class="opnote-field-select" value={state.immobilisation}
            onChange={(e) => update('immobilisation', (e.currentTarget as HTMLSelectElement).value as Immobilisation)}>
            <option value="auto">Auto — {resolvedImmobilisation === 'extended' ? 'extended (trapezial crack recorded)' : 'standard'}</option>
            <option value="standard">{IMMOBILISATION_LABEL.standard}</option>
            <option value="extended">{IMMOBILISATION_LABEL.extended}</option>
            <option value="early">{IMMOBILISATION_LABEL.early}</option>
          </select>
          <span class="opnote-field-hint">Drives the dressing step and the splint, driving and return-to-work bullets.</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Imaging</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Screening time (s)</span>
            <input class="opnote-field-input" type="text" value={state.screeningTime}
              onInput={(e) => update('screeningTime', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Dose-area product (cGy·cm²)</span>
            <input class="opnote-field-input" type="text" value={state.doseAreaProduct}
              onInput={(e) => update('doseAreaProduct', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Signature date</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Date of documentation</span>
          <input class="opnote-field-input" type="text" value={state.signatureDate}
            onInput={(e) => update('signatureDate', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>
    </OperationNoteShell>
  );
}

export const meta = {
  slug: 'trapeziometacarpal-joint-replacement-touch',
  title: 'Trapeziometacarpal joint replacement (Touch® prosthesis)',
  indication:
    'Elective cementless dual-mobility total joint replacement of the thumb carpometacarpal joint for Eaton–Littler stage II–III osteoarthritis. Implant record with lot numbers; anaesthetic, capsule, MCP-joint and immobilisation toggles; closure drives the post-op plan.',
  category: 'hand-surgery' as const,
  emits:
    'Staged diagnosis with conservative history · Consent with implant-specific risks · Antibiotic + VTE prophylaxis line · Thirteen-step implantation with fluoroscopic checks · Implant record (REF / LOT / UDI) · Radiation record · Immobilisation-specific post-op plan',
  lastReviewed: '2026-09-11',
  version: '1.1',
};

export default TrapeziometacarpalJointReplacementTouch;
