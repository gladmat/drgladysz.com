// Hand trauma — operation note template (unified).
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  hand-trauma.md
//
// Hand trauma is one accident / one OR event in which multiple structures are
// damaged simultaneously: skin, fracture, flexor tendon, extensor tendon,
// nerve. This template uses per-injury enabled flags; the renderer composes
// a single coherent note with anatomically-ordered procedure steps and a
// most-restrictive-wins post-op plan.
//
// v1: one instance per injury type. Multi-fracture / multi-nerve / multi-
// tendon (e.g. both digital nerves divided in a zone-II cut) is covered by
// editing the output free-form post-paste. Array-of-injuries is a possible
// v1.1 refactor mirroring the multi-lesion pattern in SkinLesionExcision.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, todayNZ } from './_shared/markdown';

type FixationMethod = 'kwire' | 'plate' | 'screws' | 'combined';
type FlexorZone = 'I' | 'II' | 'III' | 'IV' | 'V';
type FlexorTendons = 'fdp' | 'fds' | 'both' | 'fpl';
type ExtensorZone = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';
type NerveCaliber = 'digital' | 'major';
type NerveMethod = 'direct' | 'autograft' | 'allograft' | 'conduit';
type Anaesthesia = 'walant' | 'supraclavicular' | 'biers' | 'ga';

interface LacerationState {
  enabled: boolean;
  site: string;
  contaminated: boolean;
}

interface FractureState {
  enabled: boolean;
  bone: string;
  side: string;
  digit: string;
  pattern: 'transverse' | 'oblique' | 'spiral' | 'comminuted' | 'intra-articular';
  open: boolean;
  fixation: FixationMethod;
  kwireSize: '1.0' | '1.1' | '1.25' | '1.6';
  kwireCount: string;
  plateBrand: 'Synthes' | 'Medartis';
  plateProfile: '1.5' | '2.0' | '2.4';
  plateShape: 'straight' | 'T' | 'condylar';
  plateApproach: 'dorsal extensor-splitting' | 'mid-axial' | 'volar Henry' | 'Bruner';
  screwSize: '1.5' | '2.0' | '2.4';
  screwType: 'cortical' | 'headless compression (Acutrak / HCS)';
  screwCount: string;
}

interface FlexorState {
  enabled: boolean;
  digit: string;
  zone: FlexorZone;
  tendons: FlexorTendons;
}

interface ExtensorState {
  enabled: boolean;
  digit: string;
  zone: ExtensorZone;
  sagittalBandRepaired: boolean;
}

interface NerveState {
  enabled: boolean;
  name: string;
  caliber: NerveCaliber;
  level: string;
  sensoryDeficit: string;
  method: NerveMethod;
  gap: string;
  autograftSource: 'PIN' | 'sural' | 'MABC';
  conduitBrand: 'Axoguard' | 'NeuraGen';
}

interface State {
  date: string;
  classification: 'Elective' | 'Acute';
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  anaesthesia: Anaesthesia;
  mechanism: string;
  tetanus: 'up-to-date' | 'booster';
  laceration: LacerationState;
  fracture: FractureState;
  flexor: FlexorState;
  extensor: ExtensorState;
  nerve: NerveState;
  tourniquetOn: string;
  tourniquetOff: string;
  tourniquetTime: string;
  acc45: string;
  accMechanism: string;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  classification: 'Acute',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: true,
  anaesthesia: 'supraclavicular',
  mechanism: '[mechanism]',
  tetanus: 'up-to-date',
  laceration: {
    enabled: true,
    site: '[SITE]',
    contaminated: false,
  },
  fracture: {
    enabled: false,
    bone: 'proximal phalanx',
    side: 'right',
    digit: 'index',
    pattern: 'transverse',
    open: false,
    fixation: 'kwire',
    kwireSize: '1.1',
    kwireCount: '2',
    plateBrand: 'Synthes',
    plateProfile: '1.5',
    plateShape: 'straight',
    plateApproach: 'dorsal extensor-splitting',
    screwSize: '1.5',
    screwType: 'cortical',
    screwCount: '2',
  },
  flexor: {
    enabled: false,
    digit: '[DIGIT]',
    zone: 'II',
    tendons: 'fdp',
  },
  extensor: {
    enabled: false,
    digit: '[DIGIT]',
    zone: 'V',
    sagittalBandRepaired: false,
  },
  nerve: {
    enabled: false,
    name: 'radial digital nerve',
    caliber: 'digital',
    level: '[level]',
    sensoryDeficit: '2PD >15 mm',
    method: 'direct',
    gap: '[___]',
    autograftSource: 'PIN',
    conduitBrand: 'Axoguard',
  },
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  acc45: '[#########]',
  accMechanism: '[____]',
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL: Record<Anaesthesia, string> = {
  walant: 'WALANT',
  supraclavicular: 'Supraclavicular block',
  biers: "Bier's block",
  ga: 'GA',
};

const ANAESTHESIA_POSITION: Record<Anaesthesia, string> = {
  walant:
    'Supine, arm on hand table. WALANT 1% lignocaine with 1:100,000 adrenaline infiltrated and allowed 25 min. No tourniquet.',
  supraclavicular:
    'Supine, arm on hand table. Supraclavicular block. Upper arm tourniquet 250 mmHg, on [HH:MM] off [HH:MM] = [MM] min.',
  biers:
    "Supine, arm on hand table. Bier's block (IVRA) with 0.5% prilocaine. Upper arm tourniquet 250 mmHg, on [HH:MM] off [HH:MM] = [MM] min.",
  ga: 'Supine, arm on hand table. GA. Upper arm tourniquet 250 mmHg, on [HH:MM] off [HH:MM] = [MM] min.',
};

const TENDONS_LABEL: Record<FlexorTendons, string> = {
  fdp: 'FDP',
  fds: 'FDS',
  both: 'FDP and FDS',
  fpl: 'FPL',
};

const EXTENSOR_TECHNIQUE: Record<ExtensorZone, string> = {
  I: 'Zone I (mallet): dermo-tenodesis with 4-0 nylon figure-of-8; DIPJ in extension with extension splint; consider K-wire DIPJ if poor compliance.',
  II: 'Zones II–IV: modified Kessler core with 4-0 braided non-absorbable; epitendinous 6-0 Prolene where tendon caliber allows.',
  III: 'Zone III: modified Kessler core; central slip protected (PIPJ 0° splinting for 6 weeks if disrupted).',
  IV: 'Zone IV: modified Kessler core; epitendinous 6-0 Prolene.',
  V: 'Zone V repair: 4-strand core (modified Kessler) with 4-0 braided non-absorbable; epitendinous 6-0 Prolene circumferentially.',
  VI: 'Zone VI: 4-strand core (modified Kessler) + epitendinous 6-0 Prolene.',
  VII: 'Zone VII: 4-strand core + epitendinous 6-0 Prolene; retinaculum repaired loosely.',
  VIII:
    'Zone VIII: 4-strand core + epitendinous 6-0 Prolene; musculotendinous junction sutures placed in fascia.',
};

function fractureSteps(f: FractureState): string[] {
  switch (f.fixation) {
    case 'kwire':
      return [
        `Fracture: closed reduction under image intensifier; acceptable alignment confirmed in AP and lateral.`,
        `${f.kwireSize} mm K-wires inserted percutaneously: ${f.kwireCount} wires retrograde from fingertip crossing fracture and engaging proximal cortex; crossed for rotational stability.`,
        `Wire position confirmed in two planes on image intensifier; wires cut, bent, left protruding with caps.`,
      ];
    case 'plate':
      return [
        `Fracture: ${f.plateApproach} approach; periosteal elevation minimised; fracture exposed and reduced anatomically.`,
        `${f.plateProfile} mm ${f.plateBrand} ${f.plateShape} plate applied; cortical and locking screws inserted as needed. Lot / serial numbers on stickers attached.`,
        `Position confirmed on image intensifier in two planes; range of motion checked.`,
      ];
    case 'screws':
      return [
        `Fracture: ${f.plateApproach} approach; fracture reduced anatomically; held with provisional K-wire.`,
        `${f.screwSize} mm ${f.screwType} screws inserted in lag fashion perpendicular to fracture; ${f.screwCount} screws total. Lot / serial numbers attached.`,
        `Compression confirmed; position checked on image intensifier in two planes.`,
      ];
    case 'combined':
      return [
        `Fracture: ${f.plateApproach} approach; fracture reduced anatomically; held with provisional ${f.kwireSize} mm K-wire.`,
        `${f.plateProfile} mm ${f.plateBrand} ${f.plateShape} plate applied as definitive fixation; screws inserted as needed. Lot / serial numbers on stickers attached.`,
        `Adjunct K-wire maintained for rotational stability; cut, bent, left protruding with caps. Position confirmed on image intensifier.`,
      ];
  }
}

function flexorSteps(fl: FlexorState): string[] {
  return [
    `Flexor sheath opened between A2 and A4 pulleys preserving these critical pulleys; A1 / A3 / A5 / cruciate pulleys vented as required.`,
    `Tendon ends retrieved (proximal milked into wound or delivered via silicone catheter if friable).`,
    `Core repair: 4-strand modified Kessler with 4-0 looped Supramid, knot buried, 0.7 cm purchase each side; epitendinous 6-0 Prolene circumferentially.`,
    `Repair tested with passive range of motion — gliding under pulleys confirmed, no bunching, no gap.`,
    fl.tendons === 'both'
      ? `Both FDS and FDP repaired in like fashion; FDS slips preserved.`
      : '',
  ].filter((s) => Boolean(s));
}

function extensorSteps(ex: ExtensorState): string[] {
  return [
    `Extensor tendon at zone ${ex.zone} of ${ex.digit}: ${EXTENSOR_TECHNIQUE[ex.zone]}`,
    ex.sagittalBandRepaired
      ? `Sagittal band disruption identified and repaired with 4-0 Vicryl.`
      : `Sagittal band inspected and intact.`,
  ];
}

function nerveSteps(n: NerveState): string[] {
  const coaptation =
    n.caliber === 'digital'
      ? `Digital nerve: 3 epineurial sutures of 9-0 nylon under microscope; tension-free; ends aligned to longitudinal vessel landmarks.`
      : `Major nerve (${n.name.toLowerCase()}): group-fascicular pattern aligned (longitudinal vessel landmarks, fascicle topography); 8-0 nylon epineurial.`;
  const methodLine = (() => {
    switch (n.method) {
      case 'direct':
        return `Tension-free coaptation achievable — direct epineurial repair.`;
      case 'autograft':
        return `Gap ${n.gap} mm — autograft harvested from ${n.autograftSource}; graft sutured to proximal and distal stumps under microscope.`;
      case 'allograft':
        return `Gap ${n.gap} mm — processed nerve allograft (Avance) bridged the defect; ends sutured into graft.`;
      case 'conduit':
        return `Gap ${n.gap} mm — ${n.conduitBrand} bioabsorbable nerve conduit bridged the defect; ends sutured into conduit.`;
    }
  })();
  return [
    `${n.name} identified under loupe ×4; ends trimmed to healthy fascicular pattern.`,
    methodLine,
    coaptation,
    `Fibrin glue (Tisseel) applied as adjunct.`,
  ];
}

function splintLine(s: State): string {
  if (s.flexor.enabled) {
    return `Dorsal blocking splint applied: wrist 20° flexion, MCP 60° flexion, IPJ extension${s.flexor.tendons === 'fpl' ? '; thumb in opposition' : ''}.`;
  }
  if (s.extensor.enabled) {
    return `Volar splint applied: wrist 30° extension, MCP 0°, IPJ free.`;
  }
  if (s.fracture.enabled) {
    return `Volar splint in intrinsic-plus position; non-adherent dressing + wool / crepe.`;
  }
  if (s.nerve.enabled) {
    return `Volar splint applied to protect nerve repair from tension for 3 weeks.`;
  }
  return `Non-adherent dressing + volar splint as required.`;
}

function diagnosisBullets(s: State): string[] {
  const sublines: string[] = [];
  if (s.laceration.enabled) {
    sublines.push(`  - Laceration of skin / subcutis at ${s.laceration.site}.`);
  }
  if (s.fracture.enabled) {
    sublines.push(
      `  - ${s.fracture.open ? 'Open' : 'Closed'} fracture of ${s.fracture.bone} of ${s.fracture.side} ${s.fracture.digit} (${s.fracture.pattern}).`,
    );
  }
  if (s.flexor.enabled) {
    sublines.push(
      `  - ${TENDONS_LABEL[s.flexor.tendons]} division at zone ${s.flexor.zone} (Verdan) of ${s.flexor.digit}.`,
    );
  }
  if (s.extensor.enabled) {
    sublines.push(
      `  - Extensor tendon division at zone ${s.extensor.zone} (Verdan extensor) of ${s.extensor.digit}.`,
    );
  }
  if (s.nerve.enabled) {
    sublines.push(`  - ${s.nerve.name} division at ${s.nerve.level}.`);
  }

  const anyDeep =
    s.fracture.enabled ||
    s.flexor.enabled ||
    s.extensor.enabled ||
    s.nerve.enabled;
  const lead = anyDeep
    ? `Hand wound of ${s.laceration.enabled ? s.laceration.site : '[SITE]'} from ${s.mechanism}, with:`
    : `Hand wound of ${s.laceration.enabled ? s.laceration.site : '[SITE]'} from ${s.mechanism}; tetanus status ${s.tetanus === 'up-to-date' ? 'up-to-date' : 'booster given in ED'}.`;

  return anyDeep
    ? [lead, ...sublines, `Tetanus status ${s.tetanus === 'up-to-date' ? 'up-to-date' : 'booster given in ED'}.`]
    : [
        lead,
        `No underlying tendon, nerve, or vessel injury confirmed clinically and intra-operatively.`,
      ];
}

function consentLine(s: State): string {
  const risks: string[] = [];
  if (s.laceration.enabled)
    risks.push('bleeding, infection, scar, sensory change');
  if (s.fracture.enabled)
    risks.push(
      'stiffness (PIP / DIP), malunion, non-union, hardware prominence, K-wire migration, pin-site infection, need for hardware removal, CRPS',
    );
  if (s.flexor.enabled)
    risks.push(
      'tendon rupture (5–10%), adhesions / stiffness, triggering, bowstringing, need for tenolysis or two-stage reconstruction',
    );
  if (s.extensor.enabled)
    risks.push(
      'extensor lag, swan-neck / boutonnière deformity, sagittal-band tendon subluxation',
    );
  if (s.nerve.enabled)
    risks.push(
      'incomplete sensory recovery, painful neuroma, cold intolerance, hypersensitivity / dysaesthesia, repair failure',
    );
  if (risks.length === 0)
    risks.push('bleeding, infection, scar, sensory change, stiffness');
  return `Risks discussed: ${risks.join('; ')}; need for further surgery; ongoing hand therapy. ACC funding discussed.`;
}

function procedureSteps(s: State): string[] {
  const steps: string[] = [];
  const closedFractureOnly =
    s.fracture.enabled &&
    !s.fracture.open &&
    !s.laceration.enabled &&
    !s.flexor.enabled &&
    !s.extensor.enabled &&
    !s.nerve.enabled;

  if (!closedFractureOnly) {
    steps.push(`Wound extended with Bruner zig-zag incision.`);
    steps.push(`Neurovascular bundles identified and protected.`);
    steps.push(
      `Pulsed lavage with 1 L warmed normal saline; foreign body sought; necrotic / devitalised tissue debrided sharply.`,
    );
  }
  if (s.fracture.enabled) steps.push(...fractureSteps(s.fracture));
  if (s.flexor.enabled) steps.push(...flexorSteps(s.flexor));
  if (s.extensor.enabled) steps.push(...extensorSteps(s.extensor));
  if (s.nerve.enabled) steps.push(...nerveSteps(s.nerve));
  steps.push(`Tourniquet down; haemostasis; final irrigation.`);
  steps.push(`Skin closed with 5-0 nylon interrupted, edges everted.`);
  steps.push(splintLine(s));
  return steps;
}

function findingsBullets(s: State): string[] {
  const out: string[] = [];
  if (s.laceration.enabled)
    out.push(
      `${s.laceration.contaminated ? 'Contaminated' : 'Clean'} wound at ${s.laceration.site}; viable edges.`,
    );
  if (s.fracture.enabled)
    out.push(
      `${s.fracture.bone}: fracture reducible to anatomic alignment; ${s.fracture.pattern === 'intra-articular' ? 'intra-articular component reduced under direct vision' : 'no intra-articular involvement'}; stable to gentle stress.`,
    );
  if (s.flexor.enabled)
    out.push(
      `${TENDONS_LABEL[s.flexor.tendons]} at zone ${s.flexor.zone}: clean transection; ends viable; no retraction beyond palm.`,
    );
  if (s.extensor.enabled)
    out.push(
      `Extensor at zone ${s.extensor.zone}: clean transection; ${s.extensor.sagittalBandRepaired ? 'sagittal band disrupted and repaired' : 'sagittal band intact'}.`,
    );
  if (s.nerve.enabled)
    out.push(
      `${s.nerve.name}: clean transection; gap ${s.nerve.gap} mm after trimming; ${s.nerve.method === 'direct' ? 'tension-free coaptation' : `bridged with ${s.nerve.method === 'autograft' ? s.nerve.autograftSource + ' autograft' : s.nerve.method === 'allograft' ? 'Avance allograft' : s.nerve.conduitBrand + ' conduit'}`}.`,
    );
  return out.length > 0 ? out : [`Wound inspected; no deep-structure involvement.`];
}

function postOpBullets(s: State): string[] {
  const lines: string[] = [];
  const anyTendon = s.flexor.enabled || s.extensor.enabled;
  const anyDeep = anyTendon || s.fracture.enabled || s.nerve.enabled;

  if (anyTendon) {
    lines.push(
      `Hand therapy referral within 3 working days — early controlled motion per protocol.`,
    );
  } else if (anyDeep) {
    lines.push(`Hand therapy referral within 5 working days.`);
  } else {
    lines.push(
      `Wound check at 48 h with GP or Plastics dressings clinic; elevation.`,
    );
  }

  if (s.flexor.enabled) {
    lines.push(
      `Dorsal blocking splint 6 weeks; no active loaded grip 8 weeks; full activity 12 weeks.`,
    );
  } else if (s.extensor.enabled) {
    lines.push(`Splint 4–6 weeks; gradual return to load over 8–12 weeks.`);
  } else if (s.fracture.enabled) {
    lines.push(`Splint per protocol; X-ray at 2 and 6 weeks.`);
  } else if (s.nerve.enabled) {
    lines.push(`Splint 3 weeks; mobilise thereafter as comfort.`);
  }

  if (
    s.fracture.enabled &&
    (s.fracture.fixation === 'kwire' || s.fracture.fixation === 'combined')
  ) {
    lines.push(`K-wires out at 4 weeks in clinic; X-ray prior.`);
  }

  if (s.nerve.enabled) {
    lines.push(
      `Sensory re-education from 3–4 weeks; Tinel's sign monitored (expected advance ~1 mm/day).`,
    );
  }

  lines.push(`Analgesia: paracetamol + NSAID + oxycodone PRN.`);

  if (
    (s.laceration.enabled && s.laceration.contaminated) ||
    (s.fracture.enabled && s.fracture.open)
  ) {
    lines.push(
      `Co-amoxiclav 625 mg tds × 5 days (contaminated / open injury).`,
    );
  } else if (!anyDeep) {
    lines.push(`No prophylactic antibiotics (clean mechanism, presented <6 h).`);
  }

  lines.push(`ACC claim lodged.`);

  const followUps: string[] = ['1 week'];
  if (s.fracture.enabled) followUps.push('4 weeks (X-ray)');
  followUps.push('6 weeks');
  lines.push(`Clinic review at ${followUps.join(', ')}.`);

  if (s.nerve.enabled) {
    lines.push(`Long-term: clinic follow-up at 3, 6 and 12 months.`);
  }
  return lines;
}

function renderMarkdown(s: State): string {
  const tourniquetLine = s.anaesthesia === 'walant'
    ? ''
    : `Tourniquet 250 mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`;

  return joinSections(
    `# OPERATION NOTE — Hand trauma`,
    [
      `Date: ${s.date}    ${s.classification}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesia]}`
        : `Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesia]}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`,
    ]
      .filter(Boolean)
      .join('\n'),
    `## Diagnosis / Indication`,
    bullets(diagnosisBullets(s)),
    `## Consent`,
    consentLine(s),
    `## Position / Anaesthesia / Tourniquet`,
    [ANAESTHESIA_POSITION[s.anaesthesia], tourniquetLine]
      .filter(Boolean)
      .join(' '),
    `## Antibiotics`,
    `Cefazolin 2 g IV at induction (1 g if <80 kg).`,
    `## Procedure`,
    numbered(procedureSteps(s)),
    `## Findings`,
    bullets(findingsBullets(s)),
    `## Estimated blood loss`,
    `<10 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    s.fracture.enabled &&
      (s.fracture.fixation === 'kwire' || s.fracture.fixation === 'combined')
      ? `Swabs / needles / instruments — confirmed correct. K-wires inserted: ${s.fracture.kwireCount}.`
      : `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets(postOpBullets(s)),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function HandTrauma() {
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
  const updateNested = useCallback(
    <S extends keyof State, K extends keyof State[S]>(
      section: S,
      key: K,
      value: State[S][K],
    ) => {
      setState((prev) => ({
        ...prev,
        [section]: { ...(prev[section] as object), [key]: value },
      }));
    },
    [],
  );
  const reset = useCallback(
    () =>
      setState({
        ...INITIAL_STATE,
        date: todayNZ(),
        signatureDate: todayNZ(),
      }),
    [],
  );

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="hand-trauma"
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
              <option value="Acute">Acute</option>
              <option value="Elective">Elective</option>
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
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Anaesthesia type">
            {(['walant', 'supraclavicular', 'biers', 'ga'] as const).map((v) => (
              <label class="opnote-radio">
                <input type="radio" name="anaesthesia" value={v} checked={state.anaesthesia === v}
                  onChange={() => update('anaesthesia', v)} />
                <span>{ANAESTHESIA_LABEL[v]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Mechanism</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Mechanism of injury</span>
          <input class="opnote-field-input" type="text" value={state.mechanism}
            onInput={(e) => update('mechanism', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <div class="opnote-field">
          <span class="opnote-field-label">Tetanus status</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Tetanus status">
            {(['up-to-date', 'booster'] as const).map((v) => (
              <label class="opnote-radio">
                <input type="radio" name="tetanus" value={v} checked={state.tetanus === v}
                  onChange={() => update('tetanus', v)} />
                <span>{v === 'up-to-date' ? 'up-to-date' : 'booster given in ED'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Structures injured (check all that apply)</p>

        {/* ── Laceration card ───────────────────────────────────────── */}
        <div class="opnote-lesion-card">
          <div class="opnote-lesion-header">
            <p class="opnote-lesion-title">Laceration / wound</p>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.laceration.enabled}
                onChange={(e) => updateNested('laceration', 'enabled', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">enabled</span>
            </label>
          </div>
          {state.laceration.enabled && (
            <>
              <label class="opnote-field">
                <span class="opnote-field-label">Site</span>
                <input class="opnote-field-input" type="text" value={state.laceration.site}
                  onInput={(e) => updateNested('laceration', 'site', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-toggle">
                <input type="checkbox" checked={state.laceration.contaminated}
                  onChange={(e) => updateNested('laceration', 'contaminated', (e.currentTarget as HTMLInputElement).checked)} />
                <span class="opnote-toggle-label">Contaminated (adds co-amoxiclav 5 d)</span>
              </label>
            </>
          )}
        </div>

        {/* ── Fracture card ─────────────────────────────────────────── */}
        <div class="opnote-lesion-card">
          <div class="opnote-lesion-header">
            <p class="opnote-lesion-title">Fracture</p>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.fracture.enabled}
                onChange={(e) => updateNested('fracture', 'enabled', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">enabled</span>
            </label>
          </div>
          {state.fracture.enabled && (
            <>
              <div class="opnote-row opnote-row-3">
                <label class="opnote-field">
                  <span class="opnote-field-label">Bone</span>
                  <input class="opnote-field-input" type="text" value={state.fracture.bone}
                    onInput={(e) => updateNested('fracture', 'bone', (e.currentTarget as HTMLInputElement).value)} />
                </label>
                <label class="opnote-field">
                  <span class="opnote-field-label">Side</span>
                  <input class="opnote-field-input" type="text" value={state.fracture.side}
                    onInput={(e) => updateNested('fracture', 'side', (e.currentTarget as HTMLInputElement).value)} />
                </label>
                <label class="opnote-field">
                  <span class="opnote-field-label">Digit</span>
                  <input class="opnote-field-input" type="text" value={state.fracture.digit}
                    onInput={(e) => updateNested('fracture', 'digit', (e.currentTarget as HTMLInputElement).value)} />
                </label>
              </div>
              <div class="opnote-row opnote-row-2">
                <label class="opnote-field">
                  <span class="opnote-field-label">Pattern</span>
                  <select class="opnote-field-select" value={state.fracture.pattern}
                    onChange={(e) => updateNested('fracture', 'pattern', (e.currentTarget as HTMLSelectElement).value as FractureState['pattern'])}>
                    <option value="transverse">Transverse</option>
                    <option value="oblique">Oblique</option>
                    <option value="spiral">Spiral</option>
                    <option value="comminuted">Comminuted</option>
                    <option value="intra-articular">Intra-articular</option>
                  </select>
                </label>
                <label class="opnote-toggle">
                  <input type="checkbox" checked={state.fracture.open}
                    onChange={(e) => updateNested('fracture', 'open', (e.currentTarget as HTMLInputElement).checked)} />
                  <span class="opnote-toggle-label">Open fracture</span>
                </label>
              </div>
              <div class="opnote-field">
                <span class="opnote-field-label">Fixation method</span>
                <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Fixation method">
                  {(['kwire', 'plate', 'screws', 'combined'] as const).map((v) => (
                    <label class="opnote-radio">
                      <input type="radio" name="fixation" value={v} checked={state.fracture.fixation === v}
                        onChange={() => updateNested('fracture', 'fixation', v)} />
                      <span>
                        {v === 'kwire' && 'K-wires'}
                        {v === 'plate' && 'Plate + screws'}
                        {v === 'screws' && 'Screws (lag)'}
                        {v === 'combined' && 'Combined'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {(state.fracture.fixation === 'kwire' || state.fracture.fixation === 'combined') && (
                <div class="opnote-subsection">
                  <p class="opnote-subsection-title">K-wire details</p>
                  <div class="opnote-row opnote-row-2">
                    <label class="opnote-field">
                      <span class="opnote-field-label">Wire size (mm)</span>
                      <select class="opnote-field-select" value={state.fracture.kwireSize}
                        onChange={(e) => updateNested('fracture', 'kwireSize', (e.currentTarget as HTMLSelectElement).value as FractureState['kwireSize'])}>
                        <option value="1.0">1.0</option>
                        <option value="1.1">1.1</option>
                        <option value="1.25">1.25</option>
                        <option value="1.6">1.6</option>
                      </select>
                    </label>
                    <label class="opnote-field">
                      <span class="opnote-field-label">Number of wires</span>
                      <input class="opnote-field-input" type="text" value={state.fracture.kwireCount}
                        onInput={(e) => updateNested('fracture', 'kwireCount', (e.currentTarget as HTMLInputElement).value)} />
                    </label>
                  </div>
                </div>
              )}
              {(state.fracture.fixation === 'plate' || state.fracture.fixation === 'combined') && (
                <div class="opnote-subsection">
                  <p class="opnote-subsection-title">Plate details</p>
                  <div class="opnote-row opnote-row-3">
                    <label class="opnote-field">
                      <span class="opnote-field-label">Brand</span>
                      <select class="opnote-field-select" value={state.fracture.plateBrand}
                        onChange={(e) => updateNested('fracture', 'plateBrand', (e.currentTarget as HTMLSelectElement).value as FractureState['plateBrand'])}>
                        <option value="Synthes">Synthes</option>
                        <option value="Medartis">Medartis</option>
                      </select>
                    </label>
                    <label class="opnote-field">
                      <span class="opnote-field-label">Profile (mm)</span>
                      <select class="opnote-field-select" value={state.fracture.plateProfile}
                        onChange={(e) => updateNested('fracture', 'plateProfile', (e.currentTarget as HTMLSelectElement).value as FractureState['plateProfile'])}>
                        <option value="1.5">1.5</option>
                        <option value="2.0">2.0</option>
                        <option value="2.4">2.4</option>
                      </select>
                    </label>
                    <label class="opnote-field">
                      <span class="opnote-field-label">Shape</span>
                      <select class="opnote-field-select" value={state.fracture.plateShape}
                        onChange={(e) => updateNested('fracture', 'plateShape', (e.currentTarget as HTMLSelectElement).value as FractureState['plateShape'])}>
                        <option value="straight">Straight</option>
                        <option value="T">T</option>
                        <option value="condylar">Condylar</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
              {state.fracture.fixation === 'screws' && (
                <div class="opnote-subsection">
                  <p class="opnote-subsection-title">Screw details</p>
                  <div class="opnote-row opnote-row-3">
                    <label class="opnote-field">
                      <span class="opnote-field-label">Size (mm)</span>
                      <select class="opnote-field-select" value={state.fracture.screwSize}
                        onChange={(e) => updateNested('fracture', 'screwSize', (e.currentTarget as HTMLSelectElement).value as FractureState['screwSize'])}>
                        <option value="1.5">1.5</option>
                        <option value="2.0">2.0</option>
                        <option value="2.4">2.4</option>
                      </select>
                    </label>
                    <label class="opnote-field">
                      <span class="opnote-field-label">Type</span>
                      <select class="opnote-field-select" value={state.fracture.screwType}
                        onChange={(e) => updateNested('fracture', 'screwType', (e.currentTarget as HTMLSelectElement).value as FractureState['screwType'])}>
                        <option value="cortical">Cortical</option>
                        <option value="headless compression (Acutrak / HCS)">Headless compression</option>
                      </select>
                    </label>
                    <label class="opnote-field">
                      <span class="opnote-field-label">Number</span>
                      <input class="opnote-field-input" type="text" value={state.fracture.screwCount}
                        onInput={(e) => updateNested('fracture', 'screwCount', (e.currentTarget as HTMLInputElement).value)} />
                    </label>
                  </div>
                </div>
              )}
              {(state.fracture.fixation === 'plate' || state.fracture.fixation === 'screws' || state.fracture.fixation === 'combined') && (
                <label class="opnote-field">
                  <span class="opnote-field-label">Approach</span>
                  <select class="opnote-field-select" value={state.fracture.plateApproach}
                    onChange={(e) => updateNested('fracture', 'plateApproach', (e.currentTarget as HTMLSelectElement).value as FractureState['plateApproach'])}>
                    <option value="dorsal extensor-splitting">Dorsal extensor-splitting</option>
                    <option value="mid-axial">Mid-axial</option>
                    <option value="volar Henry">Volar Henry</option>
                    <option value="Bruner">Bruner</option>
                  </select>
                </label>
              )}
            </>
          )}
        </div>

        {/* ── Flexor card ───────────────────────────────────────────── */}
        <div class="opnote-lesion-card">
          <div class="opnote-lesion-header">
            <p class="opnote-lesion-title">Flexor tendon</p>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.flexor.enabled}
                onChange={(e) => updateNested('flexor', 'enabled', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">enabled</span>
            </label>
          </div>
          {state.flexor.enabled && (
            <>
              <div class="opnote-row opnote-row-2">
                <label class="opnote-field">
                  <span class="opnote-field-label">Digit</span>
                  <input class="opnote-field-input" type="text" value={state.flexor.digit}
                    onInput={(e) => updateNested('flexor', 'digit', (e.currentTarget as HTMLInputElement).value)} />
                </label>
                <label class="opnote-field">
                  <span class="opnote-field-label">Verdan zone</span>
                  <select class="opnote-field-select" value={state.flexor.zone}
                    onChange={(e) => updateNested('flexor', 'zone', (e.currentTarget as HTMLSelectElement).value as FlexorZone)}>
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                </label>
              </div>
              <div class="opnote-field">
                <span class="opnote-field-label">Tendons injured</span>
                <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Flexor tendons injured">
                  {(['fdp', 'fds', 'both', 'fpl'] as const).map((v) => (
                    <label class="opnote-radio">
                      <input type="radio" name="flexor-tendons" value={v} checked={state.flexor.tendons === v}
                        onChange={() => updateNested('flexor', 'tendons', v)} />
                      <span>{TENDONS_LABEL[v]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Extensor card ─────────────────────────────────────────── */}
        <div class="opnote-lesion-card">
          <div class="opnote-lesion-header">
            <p class="opnote-lesion-title">Extensor tendon</p>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.extensor.enabled}
                onChange={(e) => updateNested('extensor', 'enabled', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">enabled</span>
            </label>
          </div>
          {state.extensor.enabled && (
            <>
              <div class="opnote-row opnote-row-2">
                <label class="opnote-field">
                  <span class="opnote-field-label">Digit / location</span>
                  <input class="opnote-field-input" type="text" value={state.extensor.digit}
                    onInput={(e) => updateNested('extensor', 'digit', (e.currentTarget as HTMLInputElement).value)} />
                </label>
                <label class="opnote-field">
                  <span class="opnote-field-label">Verdan extensor zone</span>
                  <select class="opnote-field-select" value={state.extensor.zone}
                    onChange={(e) => updateNested('extensor', 'zone', (e.currentTarget as HTMLSelectElement).value as ExtensorZone)}>
                    <option value="I">I (DIP)</option>
                    <option value="II">II</option>
                    <option value="III">III (PIP)</option>
                    <option value="IV">IV</option>
                    <option value="V">V (MCP)</option>
                    <option value="VI">VI (dorsum)</option>
                    <option value="VII">VII (retinaculum)</option>
                    <option value="VIII">VIII (forearm)</option>
                  </select>
                </label>
              </div>
              <label class="opnote-toggle">
                <input type="checkbox" checked={state.extensor.sagittalBandRepaired}
                  onChange={(e) => updateNested('extensor', 'sagittalBandRepaired', (e.currentTarget as HTMLInputElement).checked)} />
                <span class="opnote-toggle-label">Sagittal band disrupted and repaired</span>
              </label>
            </>
          )}
        </div>

        {/* ── Nerve card ────────────────────────────────────────────── */}
        <div class="opnote-lesion-card">
          <div class="opnote-lesion-header">
            <p class="opnote-lesion-title">Nerve</p>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.nerve.enabled}
                onChange={(e) => updateNested('nerve', 'enabled', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">enabled</span>
            </label>
          </div>
          {state.nerve.enabled && (
            <>
              <div class="opnote-row opnote-row-2">
                <label class="opnote-field">
                  <span class="opnote-field-label">Nerve injured</span>
                  <input class="opnote-field-input" type="text" value={state.nerve.name}
                    onInput={(e) => updateNested('nerve', 'name', (e.currentTarget as HTMLInputElement).value)} />
                </label>
                <label class="opnote-field">
                  <span class="opnote-field-label">Level</span>
                  <input class="opnote-field-input" type="text" value={state.nerve.level}
                    onInput={(e) => updateNested('nerve', 'level', (e.currentTarget as HTMLInputElement).value)} />
                </label>
              </div>
              <div class="opnote-field">
                <span class="opnote-field-label">Caliber</span>
                <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Nerve caliber">
                  <label class="opnote-radio">
                    <input type="radio" name="nerve-caliber" value="digital" checked={state.nerve.caliber === 'digital'}
                      onChange={() => updateNested('nerve', 'caliber', 'digital')} />
                    <span>Digital nerve</span>
                  </label>
                  <label class="opnote-radio">
                    <input type="radio" name="nerve-caliber" value="major" checked={state.nerve.caliber === 'major'}
                      onChange={() => updateNested('nerve', 'caliber', 'major')} />
                    <span>Major (median / ulnar / radial)</span>
                  </label>
                </div>
              </div>
              <label class="opnote-field">
                <span class="opnote-field-label">Sensory deficit pre-op</span>
                <input class="opnote-field-input" type="text" value={state.nerve.sensoryDeficit}
                  onInput={(e) => updateNested('nerve', 'sensoryDeficit', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <div class="opnote-field">
                <span class="opnote-field-label">Repair method</span>
                <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Nerve repair method">
                  {(['direct', 'autograft', 'allograft', 'conduit'] as const).map((v) => (
                    <label class="opnote-radio">
                      <input type="radio" name="nerve-method" value={v} checked={state.nerve.method === v}
                        onChange={() => updateNested('nerve', 'method', v)} />
                      <span>
                        {v === 'direct' && 'Direct epineurial'}
                        {v === 'autograft' && 'Autograft'}
                        {v === 'allograft' && 'Allograft (Avance)'}
                        {v === 'conduit' && 'Conduit'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {state.nerve.method !== 'direct' && (
                <div class="opnote-subsection">
                  <p class="opnote-subsection-title">{state.nerve.method === 'autograft' ? 'Autograft' : state.nerve.method === 'allograft' ? 'Allograft' : 'Conduit'} details</p>
                  <label class="opnote-field">
                    <span class="opnote-field-label">Gap (mm)</span>
                    <input class="opnote-field-input" type="text" value={state.nerve.gap}
                      onInput={(e) => updateNested('nerve', 'gap', (e.currentTarget as HTMLInputElement).value)} />
                  </label>
                  {state.nerve.method === 'autograft' && (
                    <label class="opnote-field">
                      <span class="opnote-field-label">Donor</span>
                      <select class="opnote-field-select" value={state.nerve.autograftSource}
                        onChange={(e) => updateNested('nerve', 'autograftSource', (e.currentTarget as HTMLSelectElement).value as NerveState['autograftSource'])}>
                        <option value="PIN">PIN</option>
                        <option value="sural">Sural</option>
                        <option value="MABC">MABC</option>
                      </select>
                    </label>
                  )}
                  {state.nerve.method === 'conduit' && (
                    <label class="opnote-field">
                      <span class="opnote-field-label">Conduit</span>
                      <select class="opnote-field-select" value={state.nerve.conduitBrand}
                        onChange={(e) => updateNested('nerve', 'conduitBrand', (e.currentTarget as HTMLSelectElement).value as NerveState['conduitBrand'])}>
                        <option value="Axoguard">Axoguard</option>
                        <option value="NeuraGen">NeuraGen</option>
                      </select>
                    </label>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {state.anaesthesia !== 'walant' && (
        <div class="opnote-section">
          <p class="opnote-section-title">Tourniquet</p>
          <div class="opnote-row opnote-row-3">
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
            <label class="opnote-field">
              <span class="opnote-field-label">Total (min)</span>
              <input class="opnote-field-input" type="text" value={state.tourniquetTime}
                onInput={(e) => update('tourniquetTime', (e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
        </div>
      )}

      <div class="opnote-section">
        <p class="opnote-section-title">ACC</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">ACC45 #</span>
            <input class="opnote-field-input" type="text" value={state.acc45}
              onInput={(e) => update('acc45', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Mechanism for ACC</span>
            <input class="opnote-field-input" type="text" value={state.accMechanism}
              onInput={(e) => update('accMechanism', (e.currentTarget as HTMLInputElement).value)} />
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
  slug: 'hand-trauma',
  title: 'Hand trauma',
  indication:
    'One trauma event, multiple structures damaged. Check the boxes for the structures injured (laceration / fracture / flexor / extensor / nerve); the output composes a single coherent note in anatomic order with a most-restrictive-wins post-op plan.',
  category: 'hand-surgery' as const,
  emits:
    'Mechanism · Per-structure findings + repair steps · Splint chosen by deepest repair · Hand therapy timeline · ACC claim',
  lastReviewed: '2026-05-19',
  version: '2.0',
};

export default HandTrauma;
