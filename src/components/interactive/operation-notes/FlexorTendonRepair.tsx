// Flexor tendon repair — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  flexor-tendon-repair.md

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered } from './_shared/markdown';

interface State {
  date: string;
  theatre: string;
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  digit: string;
  zone: 'I' | 'II' | 'III' | 'IV' | 'V';
  tendonsInjured: 'fdp' | 'fds' | 'both' | 'fpl';
  associatedInjuries: boolean;
  nerveInjury: boolean;
  arteryInjury: boolean;
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
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: true,
  digit: '[DIGIT]',
  zone: 'II',
  tendonsInjured: 'fdp',
  associatedInjuries: false,
  nerveInjury: false,
  arteryInjury: false,
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  acc45: '[#########]',
  accMechanism: '[____]',
  signatureDate: '[DD/MM/YYYY]',
};

const TENDONS_LABEL: Record<State['tendonsInjured'], string> = {
  fdp: 'FDP',
  fds: 'FDS',
  both: 'FDP and FDS',
  fpl: 'FPL',
};

const TENDONS_DESC: Record<State['tendonsInjured'], string> = {
  fdp: 'FDP divided, complete laceration. FDS intact.',
  fds: 'FDS divided, complete laceration. FDP intact.',
  both: 'Both FDP and FDS divided, complete lacerations.',
  fpl: 'FPL divided, complete laceration.',
};

function renderMarkdown(s: State): string {
  const associatedLines = s.associatedInjuries
    ? [
        s.nerveInjury &&
          'Associated injury: digital nerve divided — repaired (see separate note).',
        s.arteryInjury &&
          'Associated injury: digital artery divided — ligated.',
      ].filter((x): x is string => Boolean(x))
    : [];

  return joinSections(
    `# OPERATION NOTE — Flexor tendon repair`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    Acute`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: Supraclavicular block`
        : `Anaesthetic: Supraclavicular block`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`,
    ].filter(Boolean).join('\n'),
    `## Diagnosis / Indication`,
    bullets([
      `Sharp laceration to volar digital surface of ${s.digit} at zone ${s.zone} (Verdan).`,
      TENDONS_DESC[s.tendonsInjured],
      s.associatedInjuries
        ? associatedLines.join(' ')
        : `No associated nerve or arterial injury identified.`,
    ]),
    `## Consent`,
    `Risks: rupture (5–10%), adhesions / stiffness, triggering, bowstringing (pulley loss), need for tenolysis or two-stage reconstruction, CRPS, infection, scar, sensory loss, ongoing hand therapy. ACC funding discussed.`,
    `## Position / Anaesthesia / Tourniquet`,
    `Supine, arm on hand table. Supraclavicular block. Upper arm tourniquet 250 mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`,
    `## Antibiotics`,
    `Cefazolin 2 g IV at induction.`,
    `## Procedure`,
    numbered([
      `Wound extended with Bruner zig-zag incision.`,
      `Neurovascular bundles identified and protected.`,
      `Flexor sheath opened between A2 and A4 pulleys preserving these critical pulleys; A1 / A3 / A5 / cruciate pulleys vented as required for tendon mobilisation.`,
      `Tendon ends retrieved (proximal end milked into the wound; silicone catheter used to deliver if friable).`,
      `Core repair: 4-strand modified Kessler with 4-0 looped Supramid, knot buried, 0.7 cm purchase from cut end on each side.`,
      `Epitendinous running suture with 6-0 Prolene, simple, circumferentially.`,
      `Repair tested with passive range of motion — gliding under pulleys confirmed, no bunching, no gap.`,
      `Sheath repaired loosely with 6-0 Prolene where possible.`,
      `Tourniquet down, haemostasis. Skin closed with 5-0 nylon interrupted.`,
      `Dorsal blocking splint applied: wrist 20° flexion, MCP 60° flexion, IPJ extension${s.tendonsInjured === 'fpl' ? '; thumb in opposition' : ''}.`,
    ]),
    `## Findings`,
    bullets([
      `Clean transection at zone ${s.zone} of the affected digit; tendon ends viable; no retraction beyond palm.`,
    ]),
    `## Estimated blood loss`,
    `<10 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      `Hand therapy referral within 3 working days — early active motion (Manchester / Saint John short-arc) per protocol.`,
      `Dorsal blocking splint 6 weeks; no active loaded grip 8 weeks; full activity 12 weeks.`,
      `Analgesia: paracetamol + NSAID + oxycodone PRN.`,
      `ACC claim lodged.`,
      `Clinic review at 1 week and 6 weeks.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function FlexorTendonRepair() {
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
      downloadName="flexor-tendon-repair"
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
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Injury</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Digit</span>
            <input class="opnote-field-input" type="text" value={state.digit}
              onInput={(e) => update('digit', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Verdan zone</span>
            <select class="opnote-field-select" value={state.zone}
              onChange={(e) => update('zone', (e.currentTarget as HTMLSelectElement).value as State['zone'])}>
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
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Tendons injured">
            {(['fdp', 'fds', 'both', 'fpl'] as const).map((v) => (
              <label class="opnote-radio">
                <input type="radio" name="tendons" value={v} checked={state.tendonsInjured === v}
                  onChange={() => update('tendonsInjured', v)} />
                <span>{TENDONS_LABEL[v]}</span>
              </label>
            ))}
          </div>
        </div>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.associatedInjuries}
            onChange={(e) => update('associatedInjuries', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Associated nerve or arterial injury</span>
        </label>
        {state.associatedInjuries && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Associated injuries</p>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.nerveInjury}
                onChange={(e) => update('nerveInjury', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">Digital nerve divided</span>
            </label>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.arteryInjury}
                onChange={(e) => update('arteryInjury', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">Digital artery divided</span>
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
  slug: 'flexor-tendon-repair',
  title: 'Flexor tendon repair',
  indication:
    'Acute flexor tendon laceration in the hand or wrist — Verdan zones I–V; FDP, FDS, both, or FPL.',
  category: 'hand-trauma' as const,
  emits:
    'Indication · Verdan zone · Tendon ends · Core + epitendinous repair · Dorsal blocking splint · Early-active-motion protocol · ACC claim',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default FlexorTendonRepair;
