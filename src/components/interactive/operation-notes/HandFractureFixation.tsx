// Hand fracture fixation — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  hand-fracture-fixation.md
//
// Fixation-method toggle: K-wire / plate / screws / combined.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, todayNZ } from './_shared/markdown';

type Fixation = 'kwire' | 'plate' | 'screws' | 'combined';

interface State {
  date: string;
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  anaesthesia: 'ga' | 'supraclavicular' | 'biers' | 'walant';
  bone: string;
  side: string;
  digit: string;
  pattern: 'transverse' | 'oblique' | 'spiral' | 'comminuted' | 'intra-articular';
  displacement: 'displaced' | 'undisplaced';
  angulation: 'angulated' | 'non-angulated';
  open: boolean;
  fixation: Fixation;
  kwireSize: '1.0' | '1.1' | '1.25' | '1.6';
  kwireCount: string;
  plateBrand: 'Synthes' | 'Medartis';
  plateProfile: '1.5' | '2.0' | '2.4';
  plateShape: 'straight' | 'T' | 'condylar';
  plateApproach: 'dorsal extensor-splitting' | 'mid-axial' | 'volar Henry' | 'Bruner';
  screwSize: '1.5' | '2.0' | '2.4';
  screwType: 'cortical' | 'headless compression (Acutrak / HCS)';
  screwCount: string;
  tourniquetOn: string;
  tourniquetOff: string;
  tourniquetTime: string;
  acc45: string;
  accMechanism: string;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: true,
  anaesthesia: 'supraclavicular',
  bone: 'proximal phalanx',
  side: 'right',
  digit: 'index',
  pattern: 'transverse',
  displacement: 'displaced',
  angulation: 'angulated',
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
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  acc45: '[#########]',
  accMechanism: '[____]',
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL = {
  ga: 'GA',
  supraclavicular: 'Supraclavicular block',
  biers: "Bier's block",
  walant: 'WALANT',
} as const;

const ANAESTHESIA_DETAIL = {
  ga: 'GA.',
  supraclavicular: 'Supraclavicular block.',
  biers: "Bier's block (IVRA) with 0.5% prilocaine.",
  walant: 'WALANT — 1% lignocaine with 1:100,000 adrenaline infiltrated and allowed 25 min.',
} as const;

function fixationSteps(s: State): { title: string; steps: string[] } {
  switch (s.fixation) {
    case 'kwire':
      return {
        title: 'closed reduction and percutaneous K-wire fixation',
        steps: [
          `Closed reduction under image intensifier. Acceptable alignment confirmed in AP and lateral.`,
          `${s.kwireSize} mm K-wires inserted percutaneously: ${s.kwireCount} wires retrograde from fingertip crossing fracture and engaging proximal cortex; second wire crossed for rotational stability.`,
          `Reduction and wire position confirmed in two planes on image intensifier.`,
          `Wires cut, bent and left protruding with caps.`,
        ],
      };
    case 'plate':
      return {
        title: 'open reduction and plate fixation',
        steps: [
          `Approach: ${s.plateApproach}.`,
          `Periosteal elevation minimised. Fracture exposed and reduced anatomically; held with reduction clamp / provisional K-wire.`,
          `${s.plateProfile} mm ${s.plateBrand} ${s.plateShape} plate applied; cortical and locking screws inserted as needed. Lot / serial numbers on stickers attached.`,
          `Position confirmed on image intensifier in two planes. Range of motion checked: full, no impingement.`,
        ],
      };
    case 'screws':
      return {
        title: 'open reduction and screw fixation',
        steps: [
          `Approach: ${s.plateApproach}.`,
          `Fracture reduced anatomically and held with provisional K-wire.`,
          `${s.screwSize} mm ${s.screwType} screws inserted in lag fashion perpendicular to fracture; ${s.screwCount} screws total. Lot / serial numbers attached.`,
          `Compression confirmed; position checked on image intensifier in two planes.`,
        ],
      };
    case 'combined':
      return {
        title: 'open reduction with combined K-wire and plate fixation',
        steps: [
          `Approach: ${s.plateApproach}.`,
          `Fracture reduced anatomically; held with provisional ${s.kwireSize} mm K-wire across the fracture.`,
          `${s.plateProfile} mm ${s.plateBrand} ${s.plateShape} plate applied as definitive fixation; screws inserted as needed. Lot / serial numbers on stickers attached.`,
          `Adjunct ${s.kwireSize} mm K-wire(s) maintained for rotational stability; cut, bent and left protruding with caps.`,
          `Position confirmed on image intensifier in two planes.`,
        ],
      };
  }
}

function renderMarkdown(s: State): string {
  const fix = fixationSteps(s);
  const openClosed = s.open ? 'Open' : 'Closed';
  const accLine = `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`;

  return joinSections(
    `# OPERATION NOTE — Hand fracture fixation`,
    [
      `Date: ${s.date}Acute`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesia]}`
        : `Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesia]}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      accLine,
    ].filter(Boolean).join('\n'),
    `## Diagnosis / Indication`,
    bullets([
      `${openClosed} fracture of ${s.bone} of ${s.side} ${s.digit} finger, ${s.pattern}, ${s.displacement} and ${s.angulation}.`,
      `Imaging: X-ray [DD/MM/YYYY], AP and lateral. Fracture pattern: ${s.pattern} mid-shaft.`,
      `Plan: ${fix.title.charAt(0).toUpperCase() + fix.title.slice(1)}.`,
    ]),
    `## Consent`,
    `Risks: bleeding, infection, stiffness (PIP / DIP), malunion, non-union, hardware prominence / irritation, K-wire migration, pin-site infection, need for hardware removal, CRPS, tendon adhesion, neurovascular injury, secondary surgery (tenolysis / arthrolysis). ACC funding discussed.`,
    `## Position / Prep / Drape`,
    `Supine, arm on hand table. Prep 0.5% chlorhexidine-alcohol. Hand drape.`,
    `## Anaesthesia / Tourniquet`,
    `${ANAESTHESIA_DETAIL[s.anaesthesia]} Upper arm tourniquet 250 mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`,
    `## Antibiotics`,
    `Cefazolin 2 g IV at induction (1 g if <80 kg).`,
    `## Procedure`,
    numbered([
      ...fix.steps,
      `Tourniquet down; haemostasis; copious saline lavage.`,
      s.fixation === 'kwire'
        ? `Closure: skin 4-0 nylon interrupted at pin sites if required.`
        : `Closure: extensor tendon (if split) 4-0 Vicryl; skin 4-0 nylon interrupted.`,
      `Dressing: non-adherent + wool / crepe; volar splint in intrinsic-plus position.`,
    ]),
    `## Findings`,
    bullets([
      `Fracture reducible to anatomic alignment; ${s.pattern === 'intra-articular' ? 'intra-articular component reduced under direct vision' : 'no intra-articular involvement'}; stable to gentle stress.`,
    ]),
    `## Estimated blood loss`,
    `<5 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    s.fixation === 'kwire' || s.fixation === 'combined'
      ? `Swabs / needles / instruments — confirmed correct. Number of K-wires inserted: ${s.kwireCount}.`
      : `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      `Elevation in high arm sling 48 h.`,
      `Hand therapy referral within 5 working days.`,
      s.fixation === 'kwire'
        ? `K-wires out at 4 weeks in clinic; X-ray prior.`
        : s.fixation === 'combined'
          ? `K-wires out at 4 weeks; plate left in situ unless symptomatic.`
          : `Early protected ROM at 1 week with custom splint; full active ROM at 2–4 weeks.`,
      `Analgesia: paracetamol + NSAID + oxycodone PRN.`,
      `ACC claim lodged.`,
      `Clinic + X-ray at 2 and 6 weeks.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function HandFractureFixation() {
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
  const reset = useCallback(() => setState({ ...INITIAL_STATE, date: todayNZ(), signatureDate: todayNZ() }), []);

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="hand-fracture-fixation"
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
            {(['ga', 'supraclavicular', 'biers', 'walant'] as const).map((v) => (
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
        <p class="opnote-section-title">Fracture</p>
        <div class="opnote-row opnote-row-3">
          <label class="opnote-field">
            <span class="opnote-field-label">Bone</span>
            <input class="opnote-field-input" type="text" value={state.bone}
              onInput={(e) => update('bone', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Side</span>
            <input class="opnote-field-input" type="text" value={state.side}
              onInput={(e) => update('side', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Digit</span>
            <input class="opnote-field-input" type="text" value={state.digit}
              onInput={(e) => update('digit', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-3">
          <label class="opnote-field">
            <span class="opnote-field-label">Pattern</span>
            <select class="opnote-field-select" value={state.pattern}
              onChange={(e) => update('pattern', (e.currentTarget as HTMLSelectElement).value as State['pattern'])}>
              <option value="transverse">Transverse</option>
              <option value="oblique">Oblique</option>
              <option value="spiral">Spiral</option>
              <option value="comminuted">Comminuted</option>
              <option value="intra-articular">Intra-articular</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Displacement</span>
            <select class="opnote-field-select" value={state.displacement}
              onChange={(e) => update('displacement', (e.currentTarget as HTMLSelectElement).value as State['displacement'])}>
              <option value="displaced">Displaced</option>
              <option value="undisplaced">Undisplaced</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Angulation</span>
            <select class="opnote-field-select" value={state.angulation}
              onChange={(e) => update('angulation', (e.currentTarget as HTMLSelectElement).value as State['angulation'])}>
              <option value="angulated">Angulated</option>
              <option value="non-angulated">Non-angulated</option>
            </select>
          </label>
        </div>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.open}
            onChange={(e) => update('open', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Open fracture</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Fixation</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Method</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Fixation method">
            <label class="opnote-radio">
              <input type="radio" name="fixation" value="kwire" checked={state.fixation === 'kwire'}
                onChange={() => update('fixation', 'kwire')} />
              <span>K-wires</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="fixation" value="plate" checked={state.fixation === 'plate'}
                onChange={() => update('fixation', 'plate')} />
              <span>Plate + screws</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="fixation" value="screws" checked={state.fixation === 'screws'}
                onChange={() => update('fixation', 'screws')} />
              <span>Screws (lag)</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="fixation" value="combined" checked={state.fixation === 'combined'}
                onChange={() => update('fixation', 'combined')} />
              <span>Combined (K-wire + plate)</span>
            </label>
          </div>
        </div>

        {(state.fixation === 'kwire' || state.fixation === 'combined') && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">K-wire details</p>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Wire size (mm)</span>
                <select class="opnote-field-select" value={state.kwireSize}
                  onChange={(e) => update('kwireSize', (e.currentTarget as HTMLSelectElement).value as State['kwireSize'])}>
                  <option value="1.0">1.0</option>
                  <option value="1.1">1.1</option>
                  <option value="1.25">1.25</option>
                  <option value="1.6">1.6</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Number of wires</span>
                <input class="opnote-field-input" type="text" value={state.kwireCount}
                  onInput={(e) => update('kwireCount', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
          </div>
        )}

        {(state.fixation === 'plate' || state.fixation === 'combined') && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Plate details</p>
            <div class="opnote-row opnote-row-3">
              <label class="opnote-field">
                <span class="opnote-field-label">Brand</span>
                <select class="opnote-field-select" value={state.plateBrand}
                  onChange={(e) => update('plateBrand', (e.currentTarget as HTMLSelectElement).value as State['plateBrand'])}>
                  <option value="Synthes">Synthes</option>
                  <option value="Medartis">Medartis</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Profile (mm)</span>
                <select class="opnote-field-select" value={state.plateProfile}
                  onChange={(e) => update('plateProfile', (e.currentTarget as HTMLSelectElement).value as State['plateProfile'])}>
                  <option value="1.5">1.5</option>
                  <option value="2.0">2.0</option>
                  <option value="2.4">2.4</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Shape</span>
                <select class="opnote-field-select" value={state.plateShape}
                  onChange={(e) => update('plateShape', (e.currentTarget as HTMLSelectElement).value as State['plateShape'])}>
                  <option value="straight">Straight</option>
                  <option value="T">T</option>
                  <option value="condylar">Condylar</option>
                </select>
              </label>
            </div>
            <label class="opnote-field">
              <span class="opnote-field-label">Approach</span>
              <select class="opnote-field-select" value={state.plateApproach}
                onChange={(e) => update('plateApproach', (e.currentTarget as HTMLSelectElement).value as State['plateApproach'])}>
                <option value="dorsal extensor-splitting">Dorsal extensor-splitting</option>
                <option value="mid-axial">Mid-axial</option>
                <option value="volar Henry">Volar Henry</option>
                <option value="Bruner">Bruner</option>
              </select>
            </label>
          </div>
        )}

        {state.fixation === 'screws' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Screw details</p>
            <div class="opnote-row opnote-row-3">
              <label class="opnote-field">
                <span class="opnote-field-label">Size (mm)</span>
                <select class="opnote-field-select" value={state.screwSize}
                  onChange={(e) => update('screwSize', (e.currentTarget as HTMLSelectElement).value as State['screwSize'])}>
                  <option value="1.5">1.5</option>
                  <option value="2.0">2.0</option>
                  <option value="2.4">2.4</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Type</span>
                <select class="opnote-field-select" value={state.screwType}
                  onChange={(e) => update('screwType', (e.currentTarget as HTMLSelectElement).value as State['screwType'])}>
                  <option value="cortical">Cortical</option>
                  <option value="headless compression (Acutrak / HCS)">Headless compression (Acutrak / HCS)</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Number</span>
                <input class="opnote-field-input" type="text" value={state.screwCount}
                  onInput={(e) => update('screwCount', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
            <label class="opnote-field">
              <span class="opnote-field-label">Approach</span>
              <select class="opnote-field-select" value={state.plateApproach}
                onChange={(e) => update('plateApproach', (e.currentTarget as HTMLSelectElement).value as State['plateApproach'])}>
                <option value="dorsal extensor-splitting">Dorsal extensor-splitting</option>
                <option value="mid-axial">Mid-axial</option>
                <option value="volar Henry">Volar Henry</option>
                <option value="Bruner">Bruner</option>
              </select>
            </label>
          </div>
        )}
      </div>

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
  slug: 'hand-fracture-fixation',
  title: 'Hand fracture fixation',
  indication:
    'Open or closed fixation of phalangeal, metacarpal, or carpal fracture. Fixation toggle: K-wire / plate / screws / combined.',
  category: 'hand-trauma' as const,
  emits:
    'Fracture pattern · Imaging · Fixation method · Implant lot/serial placeholder · II confirmation · Splint · K-wire removal plan · ACC claim',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default HandFractureFixation;
