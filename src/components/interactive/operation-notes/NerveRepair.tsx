// Nerve repair — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  nerve-repair.md
//
// Method toggle: direct epineurial / autograft / allograft / conduit.
// Caliber toggle: digital nerve vs major nerve (median / ulnar / radial).

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered } from './_shared/markdown';

type Method = 'direct' | 'autograft' | 'allograft' | 'conduit';
type Caliber = 'digital' | 'major';

interface State {
  date: string;
  theatre: string;
  start: string;
  end: string;
  assistant: string;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  nerve: string;
  level: string;
  caliber: Caliber;
  sensoryDeficit: string;
  motorDeficit: string;
  method: Method;
  gap: string;
  autograftSource: 'PIN' | 'sural' | 'MABC';
  conduitBrand: 'Axoguard' | 'NeuraGen';
  tourniquetOn: string;
  tourniquetOff: string;
  tourniquetTime: string;
  acc45: string;
  accMechanism: string;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  theatre: '[Theatre]',
  start: '[HH:MM]',
  end: '[HH:MM]',
  assistant: '[Registrar Dr ____]',
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: true,
  nerve: 'Radial digital nerve',
  level: '[zone/level]',
  caliber: 'digital',
  sensoryDeficit: '2PD >15 mm',
  motorDeficit: '',
  method: 'direct',
  gap: '[___]',
  autograftSource: 'PIN',
  conduitBrand: 'Axoguard',
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  acc45: '[#########]',
  accMechanism: '[____]',
  signatureDate: '[DD/MM/YYYY]',
};

const METHOD_PROCEDURE_LINES: (s: State) => string[] = (s) => {
  const coaptationLine =
    s.caliber === 'digital'
      ? `Digital nerve: 3 epineurial sutures of 9-0 nylon under microscope; tension-free; ends aligned to longitudinal vessel landmarks.`
      : `Major nerve (${s.nerve.toLowerCase()}): group-fascicular pattern aligned (longitudinal vessel landmarks, fascicle topography); 8-0 nylon epineurial.`;
  switch (s.method) {
    case 'direct':
      return [
        `Tension-free coaptation achievable — proceeded with direct epineurial repair.`,
        coaptationLine,
        `Fibrin glue (Tisseel) applied as adjunct.`,
      ];
    case 'autograft':
      return [
        `Gap ${s.gap} mm — primary repair under tension declined; autograft harvested from ${s.autograftSource}.`,
        `Graft sutured proximal and distal coaptations under microscope: ${s.caliber === 'digital' ? '9-0 / 10-0 nylon' : '8-0 / 9-0 nylon'} epineurial.`,
        `Fibrin glue (Tisseel) applied as adjunct.`,
      ];
    case 'allograft':
      return [
        `Gap ${s.gap} mm — processed nerve allograft (Avance) used; ends sutured into the graft with ${s.caliber === 'digital' ? '9-0 / 10-0 nylon' : '8-0 / 9-0 nylon'} epineurial.`,
        `Fibrin glue (Tisseel) applied as adjunct.`,
      ];
    case 'conduit':
      return [
        `Gap ${s.gap} mm — ${s.conduitBrand} bioabsorbable nerve conduit used; ends sutured into conduit with ${s.caliber === 'digital' ? '9-0 / 10-0 nylon' : '8-0 / 9-0 nylon'} epineurial.`,
        `Fibrin glue (Tisseel) applied as adjunct.`,
      ];
  }
};

function renderMarkdown(s: State): string {
  return joinSections(
    `# OPERATION NOTE — Nerve repair`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    Acute`,
      `Start: ${s.start}    End: ${s.end}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: Supraclavicular block`
        : `Anaesthetic: Supraclavicular block`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`,
    ].join('\n'),
    `## Diagnosis / Indication`,
    bullets(
      [
        `${s.nerve} of [DIGIT] laceration at ${s.level}.`,
        `Sensory deficit pre-op: ${s.sensoryDeficit}.`,
        s.motorDeficit && `Motor deficit pre-op: ${s.motorDeficit}.`,
      ].filter((x): x is string => Boolean(x)),
    ),
    `## Consent`,
    `Risks: incomplete recovery, painful neuroma, cold intolerance, hypersensitivity / dysaesthesia, repair failure requiring nerve graft, need for re-exploration, ongoing hand therapy. ACC funding discussed.`,
    `## Position / Anaesthesia / Tourniquet`,
    `Supine, arm on hand table. Supraclavicular block. Upper arm tourniquet 250 mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`,
    `## Antibiotics`,
    `Cefazolin 2 g IV at induction.`,
    `## Procedure`,
    numbered([
      `Wound extended with Bruner zig-zag incision.`,
      `Nerve ends identified under loupe ×4 magnification (operating microscope used for coaptation).`,
      `Ends trimmed back to a healthy fascicular pattern.`,
      ...METHOD_PROCEDURE_LINES(s),
      `Tourniquet down; haemostasis. Skin closed with 5-0 nylon interrupted.`,
      `Volar splint applied to protect the repair from tension for 3 weeks.`,
    ]),
    `## Findings`,
    bullets([
      `Clean transection of the affected ${s.caliber === 'digital' ? 'digital nerve' : 'major nerve'}; gap ${s.gap} mm after trimming; ${s.method === 'direct' ? 'no tension at coaptation' : `${s.method === 'autograft' ? s.autograftSource + ' autograft' : s.method === 'allograft' ? 'Avance allograft' : s.conduitBrand + ' conduit'} bridged the gap successfully`}.`,
    ]),
    `## Estimated blood loss`,
    `<10 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      `Hand therapy with sensory re-education from 3–4 weeks.`,
      `Tinel's sign monitored; expected advance ~1 mm/day.`,
      `Splint 3 weeks; mobilise thereafter as comfort.`,
      `Analgesia: paracetamol + NSAID + oxycodone PRN.`,
      `ACC claim lodged.`,
      `Clinic follow-up at 6 weeks, 3, 6 and 12 months.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function NerveRepair() {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const update = useCallback(
    <K extends keyof State>(key: K, value: State[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );
  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="nerve-repair"
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
            <span class="opnote-field-label">Theatre</span>
            <input class="opnote-field-input" type="text" value={state.theatre}
              onInput={(e) => update('theatre', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Start</span>
            <input class="opnote-field-input" type="text" value={state.start}
              onInput={(e) => update('start', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">End</span>
            <input class="opnote-field-input" type="text" value={state.end}
              onInput={(e) => update('end', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <label class="opnote-field">
          <span class="opnote-field-label">Assistant</span>
          <input class="opnote-field-input" type="text" value={state.assistant}
            onInput={(e) => update('assistant', (e.currentTarget as HTMLInputElement).value)} />
        </label>
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
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Nerve</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Nerve injured</span>
            <input class="opnote-field-input" type="text" value={state.nerve}
              onInput={(e) => update('nerve', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Level / zone</span>
            <input class="opnote-field-input" type="text" value={state.level}
              onInput={(e) => update('level', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-field">
          <span class="opnote-field-label">Caliber</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Nerve caliber">
            <label class="opnote-radio">
              <input type="radio" name="caliber" value="digital" checked={state.caliber === 'digital'}
                onChange={() => update('caliber', 'digital')} />
              <span>Digital nerve</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="caliber" value="major" checked={state.caliber === 'major'}
                onChange={() => update('caliber', 'major')} />
              <span>Major (median / ulnar / radial)</span>
            </label>
          </div>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Sensory deficit pre-op</span>
            <input class="opnote-field-input" type="text" value={state.sensoryDeficit}
              onInput={(e) => update('sensoryDeficit', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Motor deficit (if any)</span>
            <input class="opnote-field-input" type="text" value={state.motorDeficit}
              onInput={(e) => update('motorDeficit', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Repair method</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Method</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Repair method">
            <label class="opnote-radio">
              <input type="radio" name="method" value="direct" checked={state.method === 'direct'}
                onChange={() => update('method', 'direct')} />
              <span>Direct epineurial</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="method" value="autograft" checked={state.method === 'autograft'}
                onChange={() => update('method', 'autograft')} />
              <span>Autograft</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="method" value="allograft" checked={state.method === 'allograft'}
                onChange={() => update('method', 'allograft')} />
              <span>Allograft (Avance)</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="method" value="conduit" checked={state.method === 'conduit'}
                onChange={() => update('method', 'conduit')} />
              <span>Conduit</span>
            </label>
          </div>
        </div>

        {state.method !== 'direct' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">{state.method === 'autograft' ? 'Autograft' : state.method === 'allograft' ? 'Allograft' : 'Conduit'} details</p>
            <label class="opnote-field">
              <span class="opnote-field-label">Gap (mm)</span>
              <input class="opnote-field-input" type="text" value={state.gap}
                onInput={(e) => update('gap', (e.currentTarget as HTMLInputElement).value)} />
            </label>
            {state.method === 'autograft' && (
              <label class="opnote-field">
                <span class="opnote-field-label">Donor</span>
                <select class="opnote-field-select" value={state.autograftSource}
                  onChange={(e) => update('autograftSource', (e.currentTarget as HTMLSelectElement).value as State['autograftSource'])}>
                  <option value="PIN">Posterior interosseous nerve (PIN)</option>
                  <option value="sural">Sural nerve</option>
                  <option value="MABC">Medial antebrachial cutaneous (MABC)</option>
                </select>
              </label>
            )}
            {state.method === 'conduit' && (
              <label class="opnote-field">
                <span class="opnote-field-label">Conduit</span>
                <select class="opnote-field-select" value={state.conduitBrand}
                  onChange={(e) => update('conduitBrand', (e.currentTarget as HTMLSelectElement).value as State['conduitBrand'])}>
                  <option value="Axoguard">Axoguard</option>
                  <option value="NeuraGen">NeuraGen</option>
                </select>
              </label>
            )}
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
  slug: 'nerve-repair',
  title: 'Nerve repair',
  indication:
    'Acute peripheral nerve laceration — digital or major. Method toggle: direct epineurial / autograft / allograft / conduit.',
  category: 'hand-trauma' as const,
  emits:
    'Nerve · Caliber · Sensory baseline · Method-specific procedure · Gap · Splint · Sensory re-education plan · ACC claim',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default NerveRepair;
