// Skin lesion excision — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  skin-lesion-excision.md
//
// Closure-type toggle morphs the procedure, consent risks, and post-op plan
// (covers the A1–A4 variants in the locked brief: direct / FTSG / STSG /
// local flap).
//
// Multi-lesion: the form holds a lesions[] array. Adding a lesion appends a
// fresh default-bracketed entry. Output adapts:
//   - 1 lesion  → single procedure block, no "Lesion N" prefixes
//   - 2+ lesions → per-lesion subsections in Diagnosis / Procedure / Findings /
//                  Specimens; shared anaesthesia / tourniquet / antibiotics /
//                  EBL / post-op kept at case level
// Consent risks are the union of closure-specific risks across all lesions.
//
// Site-driven defaults (v1.2): a facial / periocular lesion site switches the
// skin prep to povidone-iodine aqueous and the direct/flap skin closure to a
// running 6-0 nylon. Both are `auto` by default and can be forced either way.
// Suture-removal timing and the follow-up interval are then derived from the
// resolved closure rather than hardcoded — a face closed with running nylon
// gets a 5-day removal and a 1-week clinic slot, not the old flat 2 weeks.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, ifSection, todayNZ } from './_shared/markdown';
import {
  isFacialSite,
  resolvePrepAgent,
  prepAgentPhrase,
  PREP_AGENT_LABEL,
  type PrepAgent,
} from './_shared/sites';

type Pathology =
  | 'BCC'
  | 'SCC'
  | 'SCC in situ (Bowen)'
  | 'Dysplastic naevus'
  | 'Seborrhoeic keratosis'
  | 'Other';

type ClosureType = 'direct' | 'ftsg' | 'stsg' | 'flap';

type AnaesthesiaType = 'local' | 'walant' | 'regional' | 'sedation' | 'ga';

type FlapType =
  | 'Rhomboid (Limberg)'
  | 'Bilobed (Zitelli)'
  | 'V-Y advancement'
  | 'Rotation'
  | 'Nasolabial'
  | 'Keystone';

type FtsgDonor =
  | 'Pre-auricular'
  | 'Post-auricular'
  | 'Supraclavicular'
  | 'Upper inner arm'
  | 'Groin';

type StsgDonor = 'Anterolateral thigh' | 'Buttock';

// Skin-suture technique + gauge for direct closure and local-flap inset.
// `auto` resolves per-lesion from the site: facial → running 6-0 (the usual
// facial closure), everything else → interrupted 5-0 (the pre-v1.2 default).
type SkinSuture =
  | 'auto'
  | 'interrupted-5-0'
  | 'interrupted-6-0'
  | 'running-5-0'
  | 'running-6-0';

type ResolvedSkinSuture = Exclude<SkinSuture, 'auto'>;

interface Lesion {
  site: string;
  size: string;
  pathology: Pathology;
  margin: string;
  closureType: ClosureType;
  skinSuture: SkinSuture;
  ftsgDonor: FtsgDonor;
  stsgDonor: StsgDonor;
  stsgThickness: '0.008' | '0.010' | '0.012';
  stsgMeshed: boolean;
  stsgNPWT: boolean;
  flapType: FlapType;
  specimenOrientation: string;
}

interface State {
  date: string;
  classification: 'Elective' | 'Acute';
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  anaesthesiaType: AnaesthesiaType;
  prepAgent: PrepAgent;
  lesions: Lesion[];
  tourniquetUsed: boolean;
  tourniquetPressure: string;
  tourniquetOn: string;
  tourniquetOff: string;
  antibioticsGiven: boolean;
  antibioticDrug: string;
  ebl: string;
  accClaim: boolean;
  acc45: string;
  accMechanism: string;
  // `auto` derives the follow-up sentence from the resolved closures; typing
  // in the field flips this to `custom` and `followUp` becomes authoritative.
  followUpMode: 'auto' | 'custom';
  followUp: string;
  extraNotes: string;
  signatureDate: string;
}

const DEFAULT_FIRST_LESION: Lesion = {
  site: 'right cheek',
  size: '8',
  pathology: 'BCC',
  margin: '3',
  closureType: 'direct',
  skinSuture: 'auto',
  ftsgDonor: 'Pre-auricular',
  stsgDonor: 'Anterolateral thigh',
  stsgThickness: '0.010',
  stsgMeshed: false,
  stsgNPWT: false,
  flapType: 'Rhomboid (Limberg)',
  specimenOrientation: 'short = superior, long = lateral',
};

const NEW_LESION: Lesion = {
  site: '[site]',
  size: '[size]',
  pathology: 'BCC',
  margin: '[margin]',
  closureType: 'direct',
  skinSuture: 'auto',
  ftsgDonor: 'Pre-auricular',
  stsgDonor: 'Anterolateral thigh',
  stsgThickness: '0.010',
  stsgMeshed: false,
  stsgNPWT: false,
  flapType: 'Rhomboid (Limberg)',
  specimenOrientation: 'short = superior, long = lateral',
};

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  classification: 'Elective',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: false,
  anaesthesiaType: 'local',
  prepAgent: 'auto',
  lesions: [DEFAULT_FIRST_LESION],
  tourniquetUsed: false,
  tourniquetPressure: '250',
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  antibioticsGiven: false,
  antibioticDrug: 'Cefazolin 2 g IV at induction',
  ebl: '<5 mL',
  accClaim: false,
  acc45: '[#########]',
  accMechanism: '[____]',
  followUpMode: 'auto',
  followUp: '',
  extraNotes: '',
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL: Record<AnaesthesiaType, string> = {
  local: 'Local infiltration',
  walant: 'WALANT',
  regional: 'Regional block',
  sedation: 'Sedation + LA',
  ga: 'GA',
};

const ANAESTHESIA_DETAIL: Record<AnaesthesiaType, string> = {
  // Per the Waikato nurse-initiated local anaesthetic guideline (W1132HWF,
  // 03/23). WALANT below deliberately stays at 1% / 1:100,000 — that is the
  // hand-surgery standard and the dilute mix would be wrong there.
  local:
    'Local infiltration of 0.4% lignocaine with 1:250,000 adrenaline, 1–1.5 mL/kg subcutaneously to the marked areas; allowed 7 min for vasoconstriction.',
  walant:
    'WALANT: 1% lignocaine with 1:100,000 adrenaline infiltrated and allowed 25 min.',
  regional: 'Regional block ([block type]).',
  sedation: 'IV sedation with local infiltration as above.',
  ga: 'GA.',
};

const CLOSURE_PLAN_LABEL: Record<ClosureType, string> = {
  direct: 'direct primary closure',
  ftsg: 'FTSG reconstruction',
  stsg: 'STSG reconstruction',
  flap: 'local flap reconstruction',
};

// Closure-specific consent risk additions, keyed by closure type. Multi-lesion
// renders the union (no duplicates) across all lesion closure types.
const CLOSURE_RISKS_BY_TYPE: Record<ClosureType, string> = {
  direct: '',
  ftsg: 'graft failure, donor-site scar, pigmentary mismatch',
  stsg: 'graft failure, donor-site pain and slow healing 14–21 d, mesh pattern visible if meshed',
  flap: 'flap necrosis, trapdoor deformity, dog-ear, pincushioning',
};

function unionClosureRisks(lesions: Lesion[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const l of lesions) {
    const r = CLOSURE_RISKS_BY_TYPE[l.closureType];
    if (r && !seen.has(r)) {
      seen.add(r);
      parts.push(r);
    }
  }
  return parts.length > 0 ? ', ' + parts.join(', ') : '';
}

// --- Site-driven resolution -------------------------------------------------

function anyLesionFacial(lesions: Lesion[]): boolean {
  return lesions.some((l) => isFacialSite(l.site));
}

function prepLine(s: State): string {
  const facial = anyLesionFacial(s.lesions);
  const agent = resolvePrepAgent(s.prepAgent, facial);
  return `Supine; ${prepAgentPhrase(agent, facial)}; standard drape.`;
}

function resolveSkinSuture(l: Lesion): ResolvedSkinSuture {
  if (l.skinSuture !== 'auto') return l.skinSuture;
  return isFacialSite(l.site) ? 'running-6-0' : 'interrupted-5-0';
}

// "6-0 nylon running" — parallels the existing "5-0 nylon interrupted" shape
// so the closure sentence reads the same either way.
const SKIN_SUTURE_PHRASE: Record<ResolvedSkinSuture, string> = {
  'interrupted-5-0': '5-0 nylon interrupted',
  'interrupted-6-0': '6-0 nylon interrupted',
  'running-5-0': '5-0 nylon running',
  'running-6-0': '6-0 nylon running',
};

const SKIN_SUTURE_LABEL: Record<ResolvedSkinSuture, string> = {
  'interrupted-5-0': 'Interrupted 5-0 nylon',
  'interrupted-6-0': 'Interrupted 6-0 nylon',
  'running-5-0': 'Running 5-0 nylon',
  'running-6-0': 'Running 6-0 nylon',
};

function isRunning(suture: ResolvedSkinSuture): boolean {
  return suture.startsWith('running-');
}

function lesionProcedureSteps(l: Lesion): string[] {
  const common = [
    `Lesion marked with ${l.margin} mm clinical margin; ${l.closureType === 'direct' ? 'ellipse oriented along RSTL with ~3:1 length-to-width ratio' : 'orientation along RSTL'}.`,
    `Skin incised with #15 blade; ${l.closureType === 'direct' ? 'ellipse excised en bloc to deep subcutis' : 'lesion excised en bloc to deep subcutis'}.`,
    `Orientation suture placed: ${l.specimenOrientation}. Specimen sent in formalin for histology.`,
    `Haemostasis: bipolar diathermy; wound irrigated with normal saline.`,
  ];
  switch (l.closureType) {
    case 'direct':
      return [
        ...common,
        `Wide subdermal undermining as required to mobilise edges.`,
        `Closure: deep dermal 4-0 Monocryl interrupted; skin ${SKIN_SUTURE_PHRASE[resolveSkinSuture(l)]}.`,
      ];
    case 'ftsg':
      return [
        ...common,
        `Defect templated; donor site: ${l.ftsgDonor}.`,
        `FTSG harvested, defatted, inset with 5-0 nylon interrupted; tie-over bolster placed (Jelonet + saline-soaked cotton wool + 4-0 silk anchor sutures).`,
        `Donor closed primarily: 4-0 Monocryl deep dermal; 5-0 nylon skin.`,
      ];
    case 'stsg':
      return [
        ...common,
        `STSG harvested from ${l.stsgDonor} with Zimmer dermatome at ${l.stsgThickness} inch.`,
        `Graft ${l.stsgMeshed ? 'meshed 1:1.5 with mesher' : 'left as sheet, fenestrated'}; inset with skin staples; ${l.stsgNPWT ? 'NPWT at -75 mmHg' : 'tie-over bolster'} for 5–7 days.`,
        `Donor site dressed with Mepitel One + Mepore.`,
      ];
    case 'flap':
      return [
        ...common,
        `${l.flapType} flap designed, elevated in subcutaneous plane, transposed / advanced to defect.`,
        `Donor closed primarily; flap inset with 4-0 Monocryl deep dermal and skin ${SKIN_SUTURE_PHRASE[resolveSkinSuture(l)]}.`,
      ];
  }
}

// Post-operative aftercare for one lesion's resolved closure.
//
// The four closures diverge more than the old flat plan allowed: a bolstered
// graft is NOT "keep dressing dry 48 h", an FTSG has a second (donor) suture
// line to remove, and an STSG donor is the site that actually hurts. So each
// closure owns its wound-care bullets and its own removal bullets, and the
// case-level plan merges them.
//
//   woundCare — dressing handling, bolster, donor site, precautions
//   removal   — what comes out and when
//   day       — earliest removal day, drives the follow-up interval
interface ClosureAftercare {
  woundCare: string[];
  removal: string[];
  day: number;
}

// Skin sutures on the lesion itself, for the two closures that have them.
function skinSutureRemoval(l: Lesion): { line: string; day: number } {
  if (!isFacialSite(l.site)) {
    return { line: `Sutures out at 10–14 days (trunk / limb).`, day: 10 };
  }
  return isRunning(resolveSkinSuture(l))
    ? {
        line: `Sutures out at 5 days (face) — running suture, early removal avoids cross-hatching.`,
        day: 5,
      }
    : { line: `Sutures out at 5–7 days (face).`, day: 5 };
}

function lesionAftercare(l: Lesion): ClosureAftercare {
  const dryDressing = `Keep dressing dry 48 h; elevate where applicable.`;
  switch (l.closureType) {
    case 'direct': {
      const { line, day } = skinSutureRemoval(l);
      return { woundCare: [dryDressing], removal: [line], day };
    }
    case 'flap': {
      const { line, day } = skinSutureRemoval(l);
      return {
        woundCare: [
          dryDressing,
          `No pressure on the flap; avoid dependent positioning until the dressing is down.`,
          `Pincushioning / trapdoor deformity: daily massage from 3 weeks; do not consider revision before 6 months.`,
        ],
        removal: [line],
        day,
      };
    }
    case 'ftsg': {
      // The donor is closed with 5-0 nylon in the procedure steps, so it has
      // its own removal timing — driven by the donor site, not the lesion.
      const facialDonor = isFacialSite(l.ftsgDonor);
      return {
        woundCare: [
          `Tie-over bolster left undisturbed until day 7; graft inspected at bolster removal.`,
          `No shearing or pressure on the graft for 2 weeks.`,
          `Once healed: daily moisturiser and massage; sun protection for 12 months.`,
        ],
        removal: [
          `Graft sutures out with the bolster at 7 days.`,
          `Donor sutures out at ${facialDonor ? '5–7' : '10–14'} days (${l.ftsgDonor.toLowerCase()} donor).`,
        ],
        day: 7,
      };
    }
    case 'stsg':
      return {
        woundCare: [
          `${l.stsgNPWT ? 'NPWT' : 'Tie-over bolster'} down at 5–7 days; graft inspected at first dressing change.`,
          `Donor site (Mepitel One + Mepore) left undisturbed 10–14 days until the dressing separates; reinforce rather than change if strike-through.`,
        ],
        removal: [`Staples out at 7–10 days.`],
        day: 7,
      };
  }
}

function isMalignant(l: Lesion): boolean {
  return (
    l.pathology === 'BCC' ||
    l.pathology === 'SCC' ||
    l.pathology === 'SCC in situ (Bowen)'
  );
}

// Derived follow-up sentence: the clinic visit tracks the earliest removal,
// and the histology visit is only offered when something went to histology
// that can come back malignant.
function autoFollowUp(s: State): string {
  const earliest = Math.min(...s.lesions.map((l) => lesionAftercare(l).day));
  const removalVisit = earliest <= 7 ? '1 week' : '2 weeks';
  const histology = s.lesions.some(isMalignant)
    ? ' and 6 weeks (with histology)'
    : '';
  return `Plastics clinic ${removalVisit} (suture removal)${histology}`;
}

function followUpValue(s: State): string {
  return s.followUpMode === 'auto' ? autoFollowUp(s) : s.followUp;
}

// Collects one field across every lesion, de-duplicated, in lesion order.
// Two facial direct closures collapse to one bullet; a facial excision plus a
// shin graft keep both. Per-lesion collection (rather than a case-level
// `some()`) is what lets two STSGs with different bolsters each state their
// own — the old some() reported whichever it found first for both.
function mergeAftercare(
  lesions: Lesion[],
  field: 'woundCare' | 'removal',
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lesions) {
    for (const line of lesionAftercare(l)[field]) {
      if (!seen.has(line)) {
        seen.add(line);
        out.push(line);
      }
    }
  }
  return out;
}

function postOpPlan(s: State): string[] {
  const anyStsg = s.lesions.some((l) => l.closureType === 'stsg');
  const lines: string[] = [
    ...mergeAftercare(s.lesions, 'woundCare'),
    anyStsg
      ? `Analgesia: regular paracetamol; ibuprofen PRN — warn the donor site is usually more painful than the graft.`
      : `Analgesia: regular paracetamol; ibuprofen PRN.`,
    ...mergeAftercare(s.lesions, 'removal'),
  ];
  lines.push(`Histology review at clinic.`);
  lines.push(`Follow-up: ${followUpValue(s)}.`);
  if (s.accClaim) lines.push(`ACC claim ${s.acc45} lodged.`);
  if (s.extraNotes) lines.push(s.extraNotes);
  if (s.lesions.some(isMalignant)) lines.push(`GP letter to be sent.`);
  return lines;
}

function renderMarkdown(s: State): string {
  const multi = s.lesions.length > 1;

  const diagnosisLines = s.lesions.map((l, i) => {
    const prefix = multi ? `Lesion ${i + 1}: ` : '';
    return `${prefix}${l.pathology} of ${l.site}, ${l.size} mm.`;
  });
  if (multi) {
    diagnosisLines.push(
      `Plan: Excision of each lesion (see per-lesion details below).`,
    );
  } else {
    const l = s.lesions[0];
    diagnosisLines.push(
      `Plan: Excision with ${l.margin} mm clinical margin and ${CLOSURE_PLAN_LABEL[l.closureType]}.`,
    );
  }

  const procedureBlock = multi
    ? joinSections(
        ...s.lesions.map(
          (l, i) =>
            `### Lesion ${i + 1} — ${l.site} (${l.pathology})\n\n${numbered(
              lesionProcedureSteps(l),
            )}`,
        ),
      )
    : numbered(lesionProcedureSteps(s.lesions[0]));

  const findingsLines = s.lesions.map((l, i) => {
    const prefix = multi
      ? `Lesion ${i + 1} (${l.site}): `
      : `${l.pathology} ${l.size} mm at ${l.site}; `;
    return `${prefix}clinically clear margins; no deep invasion observed.`;
  });

  const specimenLines = s.lesions.map((l, i) => {
    const suffix = multi ? ` (Lesion ${i + 1})` : '';
    // Specimen labels are sentence-initial on the pathology form.
    const site = l.site.charAt(0).toUpperCase() + l.site.slice(1);
    return `"${site} lesion${suffix} — ${l.specimenOrientation}" → Histology.`;
  });

  return joinSections(
    `# OPERATION NOTE — Skin lesion excision`,
    [
      `Date: ${s.date}    ${s.classification}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesiaType]}`
        : `Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesiaType]}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      ifSection(
        s.accClaim,
        `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`,
      ),
    ]
      .filter(Boolean)
      .join('\n'),
    `## Diagnosis / Indication`,
    bullets(diagnosisLines),
    `## Consent`,
    `Risks discussed: bleeding, haematoma, infection, scar, recurrence, incomplete excision requiring re-excision, sensory change, dehiscence, asymmetry, suture reaction${unionClosureRisks(s.lesions)}.`,
    `## Position / Prep / Drape`,
    prepLine(s),
    `## Anaesthesia`,
    ANAESTHESIA_DETAIL[s.anaesthesiaType] +
      ifSection(
        s.tourniquetUsed,
        `\nTourniquet: ${s.tourniquetPressure} mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff}.`,
      ) +
      ifSection(
        s.antibioticsGiven,
        `\nAntibiotic prophylaxis: ${s.antibioticDrug}.`,
      ),
    `## Procedure`,
    procedureBlock,
    `## Findings`,
    bullets(findingsLines),
    `## Specimens`,
    bullets(specimenLines),
    `## Estimated blood loss`,
    `${s.ebl}.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets(postOpPlan(s)),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function SkinLesionExcision() {
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
  const updateLesion = useCallback(
    <K extends keyof Lesion>(index: number, key: K, value: Lesion[K]) => {
      setState((prev) => ({
        ...prev,
        lesions: prev.lesions.map((l, i) =>
          i === index ? { ...l, [key]: value } : l,
        ),
      }));
    },
    [],
  );
  const addLesion = useCallback(() => {
    setState((prev) => ({ ...prev, lesions: [...prev.lesions, { ...NEW_LESION }] }));
  }, []);
  const removeLesion = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      lesions:
        prev.lesions.length <= 1
          ? prev.lesions
          : prev.lesions.filter((_, i) => i !== index),
    }));
  }, []);
  // Typing in the follow-up field takes it off auto; the reset button hands
  // it back. Storing '' on auto keeps the two modes from drifting apart.
  const editFollowUp = useCallback((value: string) => {
    setState((prev) => ({ ...prev, followUpMode: 'custom', followUp: value }));
  }, []);
  const resetFollowUp = useCallback(() => {
    setState((prev) => ({ ...prev, followUpMode: 'auto', followUp: '' }));
  }, []);
  const reset = useCallback(() => setState({ ...INITIAL_STATE, date: todayNZ(), signatureDate: todayNZ() }), []);

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="skin-lesion-excision"
      formTitle="Inputs"
    >
      <div class="opnote-section">
        <p class="opnote-section-title">Header</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Date of op</span>
            <input class="opnote-field-input" type="text" value={state.date}
              onInput={(e) => update('date', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Classification</span>
            <select class="opnote-field-select" value={state.classification}
              onChange={(e) => update('classification', (e.currentTarget as HTMLSelectElement).value as State['classification'])}>
              <option value="Elective">Elective</option>
              <option value="Acute">Acute</option>
            </select>
          </label>
        </div>
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
          <input type="checkbox" checked={state.hasAnaesthetist}
            onChange={(e) => update('hasAnaesthetist', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Anaesthetist present (uncheck for purely local procedures)</span>
        </label>
        {state.hasAnaesthetist && (
          <label class="opnote-field">
            <span class="opnote-field-label">Anaesthetist</span>
            <input class="opnote-field-input" type="text" value={state.anaesthetist}
              onInput={(e) => update('anaesthetist', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
        <div class="opnote-field">
          <span class="opnote-field-label">Anaesthesia type</span>
          <div class="opnote-radio-group opnote-radio-group-cols-3" role="radiogroup" aria-label="Anaesthesia type">
            {(['local', 'walant', 'regional', 'sedation', 'ga'] as const).map((v) => (
              <label class="opnote-radio">
                <input type="radio" name="anaesthesia" value={v} checked={state.anaesthesiaType === v}
                  onChange={() => update('anaesthesiaType', v)} />
                <span>{ANAESTHESIA_LABEL[v]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">
          Lesions ({state.lesions.length})
        </p>
        {state.lesions.map((lesion, i) => (
          <div class="opnote-lesion-card" key={`lesion-${i}`}>
            <div class="opnote-lesion-header">
              <p class="opnote-lesion-title">Lesion {i + 1}</p>
              {state.lesions.length > 1 && (
                <button
                  type="button"
                  class="opnote-lesion-remove"
                  onClick={() => removeLesion(i)}
                  aria-label={`Remove lesion ${i + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Site</span>
                <input class="opnote-field-input" type="text" value={lesion.site}
                  onInput={(e) => updateLesion(i, 'site', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Size (mm)</span>
                <input class="opnote-field-input" type="text" value={lesion.size}
                  onInput={(e) => updateLesion(i, 'size', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Suspected pathology</span>
                <select class="opnote-field-select" value={lesion.pathology}
                  onChange={(e) => updateLesion(i, 'pathology', (e.currentTarget as HTMLSelectElement).value as Pathology)}>
                  <option value="BCC">BCC</option>
                  <option value="SCC">SCC</option>
                  <option value="SCC in situ (Bowen)">SCC in situ (Bowen)</option>
                  <option value="Dysplastic naevus">Dysplastic naevus</option>
                  <option value="Seborrhoeic keratosis">Seborrhoeic keratosis</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Clinical margin (mm)</span>
                <input class="opnote-field-input" type="text" value={lesion.margin}
                  onInput={(e) => updateLesion(i, 'margin', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
            <div class="opnote-field">
              <span class="opnote-field-label">Closure type</span>
              <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label={`Closure type for lesion ${i + 1}`}>
                {(['direct', 'ftsg', 'stsg', 'flap'] as const).map((v) => (
                  <label class="opnote-radio">
                    <input type="radio" name={`closure-${i}`} value={v} checked={lesion.closureType === v}
                      onChange={() => updateLesion(i, 'closureType', v)} />
                    <span>
                      {v === 'direct' && 'Direct primary'}
                      {v === 'ftsg' && 'FTSG'}
                      {v === 'stsg' && 'STSG'}
                      {v === 'flap' && 'Local flap'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {(lesion.closureType === 'direct' || lesion.closureType === 'flap') && (
              <label class="opnote-field">
                <span class="opnote-field-label">Skin suture</span>
                <select class="opnote-field-select" value={lesion.skinSuture}
                  onChange={(e) => updateLesion(i, 'skinSuture', (e.currentTarget as HTMLSelectElement).value as SkinSuture)}>
                  <option value="auto">
                    Auto — {SKIN_SUTURE_LABEL[resolveSkinSuture({ ...lesion, skinSuture: 'auto' })]}
                  </option>
                  <option value="interrupted-5-0">Interrupted 5-0 nylon</option>
                  <option value="interrupted-6-0">Interrupted 6-0 nylon</option>
                  <option value="running-5-0">Running 5-0 nylon</option>
                  <option value="running-6-0">Running 6-0 nylon</option>
                </select>
              </label>
            )}

            {lesion.closureType === 'ftsg' && (
              <div class="opnote-subsection">
                <p class="opnote-subsection-title">FTSG donor site</p>
                <label class="opnote-field">
                  <span class="opnote-field-label">Donor site</span>
                  <select class="opnote-field-select" value={lesion.ftsgDonor}
                    onChange={(e) => updateLesion(i, 'ftsgDonor', (e.currentTarget as HTMLSelectElement).value as FtsgDonor)}>
                    <option value="Pre-auricular">Pre-auricular</option>
                    <option value="Post-auricular">Post-auricular</option>
                    <option value="Supraclavicular">Supraclavicular</option>
                    <option value="Upper inner arm">Upper inner arm</option>
                    <option value="Groin">Groin</option>
                  </select>
                </label>
              </div>
            )}

            {lesion.closureType === 'stsg' && (
              <div class="opnote-subsection">
                <p class="opnote-subsection-title">STSG</p>
                <div class="opnote-row opnote-row-2">
                  <label class="opnote-field">
                    <span class="opnote-field-label">Donor site</span>
                    <select class="opnote-field-select" value={lesion.stsgDonor}
                      onChange={(e) => updateLesion(i, 'stsgDonor', (e.currentTarget as HTMLSelectElement).value as StsgDonor)}>
                      <option value="Anterolateral thigh">Anterolateral thigh</option>
                      <option value="Buttock">Buttock</option>
                    </select>
                  </label>
                  <label class="opnote-field">
                    <span class="opnote-field-label">Thickness (inch)</span>
                    <select class="opnote-field-select" value={lesion.stsgThickness}
                      onChange={(e) => updateLesion(i, 'stsgThickness', (e.currentTarget as HTMLSelectElement).value as Lesion['stsgThickness'])}>
                      <option value="0.008">0.008</option>
                      <option value="0.010">0.010</option>
                      <option value="0.012">0.012</option>
                    </select>
                  </label>
                </div>
                <label class="opnote-toggle">
                  <input type="checkbox" checked={lesion.stsgMeshed}
                    onChange={(e) => updateLesion(i, 'stsgMeshed', (e.currentTarget as HTMLInputElement).checked)} />
                  <span class="opnote-toggle-label">Meshed 1:1.5</span>
                </label>
                <label class="opnote-toggle">
                  <input type="checkbox" checked={lesion.stsgNPWT}
                    onChange={(e) => updateLesion(i, 'stsgNPWT', (e.currentTarget as HTMLInputElement).checked)} />
                  <span class="opnote-toggle-label">NPWT bolster (vs tie-over)</span>
                </label>
              </div>
            )}

            {lesion.closureType === 'flap' && (
              <div class="opnote-subsection">
                <p class="opnote-subsection-title">Flap type</p>
                <label class="opnote-field">
                  <span class="opnote-field-label">Flap design</span>
                  <select class="opnote-field-select" value={lesion.flapType}
                    onChange={(e) => updateLesion(i, 'flapType', (e.currentTarget as HTMLSelectElement).value as FlapType)}>
                    <option>Rhomboid (Limberg)</option>
                    <option>Bilobed (Zitelli)</option>
                    <option>V-Y advancement</option>
                    <option>Rotation</option>
                    <option>Nasolabial</option>
                    <option>Keystone</option>
                  </select>
                </label>
              </div>
            )}

            <label class="opnote-field">
              <span class="opnote-field-label">Specimen orientation</span>
              <input class="opnote-field-input" type="text" value={lesion.specimenOrientation}
                onInput={(e) => updateLesion(i, 'specimenOrientation', (e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
        ))}
        <button type="button" class="opnote-add-lesion" onClick={addLesion}>
          + Add another lesion
        </button>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Perioperative</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Skin prep</span>
          <div class="opnote-radio-group opnote-radio-group-cols-3" role="radiogroup" aria-label="Skin prep agent">
            {(['auto', 'chlorhexidine', 'betadine'] as const).map((v) => (
              <label class="opnote-radio">
                <input type="radio" name="prep" value={v} checked={state.prepAgent === v}
                  onChange={() => update('prepAgent', v)} />
                <span>
                  {v === 'auto'
                    ? `Auto — ${PREP_AGENT_LABEL[resolvePrepAgent('auto', anyLesionFacial(state.lesions))]}`
                    : PREP_AGENT_LABEL[v]}
                </span>
              </label>
            ))}
          </div>
        </div>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.tourniquetUsed}
            onChange={(e) => update('tourniquetUsed', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Tourniquet used</span>
        </label>
        {state.tourniquetUsed && (
          <div class="opnote-subsection">
            <div class="opnote-row opnote-row-3">
              <label class="opnote-field">
                <span class="opnote-field-label">Pressure (mmHg)</span>
                <input class="opnote-field-input" type="text" value={state.tourniquetPressure}
                  onInput={(e) => update('tourniquetPressure', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">On</span>
                <input class="opnote-field-input" type="text" value={state.tourniquetOn}
                  onInput={(e) => update('tourniquetOn', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Off</span>
                <input class="opnote-field-input" type="text" value={state.tourniquetOff}
                  onInput={(e) => update('tourniquetOff', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
          </div>
        )}
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.antibioticsGiven}
            onChange={(e) => update('antibioticsGiven', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Antibiotic prophylaxis given</span>
        </label>
        {state.antibioticsGiven && (
          <div class="opnote-subsection">
            <label class="opnote-field">
              <span class="opnote-field-label">Drug</span>
              <input class="opnote-field-input" type="text" value={state.antibioticDrug}
                onInput={(e) => update('antibioticDrug', (e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
        )}
        <label class="opnote-field">
          <span class="opnote-field-label">Estimated blood loss</span>
          <input class="opnote-field-input" type="text" value={state.ebl}
            onInput={(e) => update('ebl', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">ACC</p>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.accClaim}
            onChange={(e) => update('accClaim', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">ACC claim relevant</span>
        </label>
        {state.accClaim && (
          <div class="opnote-subsection">
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">ACC45 #</span>
                <input class="opnote-field-input" type="text" value={state.acc45}
                  onInput={(e) => update('acc45', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Mechanism</span>
                <input class="opnote-field-input" type="text" value={state.accMechanism}
                  onInput={(e) => update('accMechanism', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
          </div>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Post-op</p>
        <label class="opnote-field">
          <span class="opnote-field-label">
            Follow-up
            {state.followUpMode === 'auto'
              ? ' — derived from closure type'
              : ' — overridden'}
          </span>
          <input class="opnote-field-input" type="text" value={followUpValue(state)}
            onInput={(e) => editFollowUp((e.currentTarget as HTMLInputElement).value)} />
        </label>
        {state.followUpMode === 'custom' && (
          <button type="button" class="opnote-add-lesion" onClick={resetFollowUp}>
            Reset follow-up to automatic
          </button>
        )}
        <label class="opnote-field">
          <span class="opnote-field-label">Additional notes</span>
          <textarea class="opnote-field-textarea" value={state.extraNotes}
            onInput={(e) => update('extraNotes', (e.currentTarget as HTMLTextAreaElement).value)} />
        </label>
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
  slug: 'skin-lesion-excision',
  title: 'Skin lesion excision',
  indication:
    'Excision of one or more benign or malignant cutaneous lesions on a single patient. Closure morphs per lesion: direct / FTSG / STSG / local flap.',
  category: 'skin-soft-tissue' as const,
  emits:
    'Indication · Per-lesion pathology and margin · Site-driven skin prep · Per-lesion closure procedure and skin suture · Per-lesion specimen orientation · Closure-specific post-op plan, removals and follow-up',
  lastReviewed: '2026-08-11',
  version: '1.3',
};

export default SkinLesionExcision;
