// Extensor tendon repair — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  extensor-tendon-repair.md

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
  zone: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII';
  sagittalBandRepaired: boolean;
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
  zone: 'V',
  sagittalBandRepaired: false,
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  acc45: '[#########]',
  accMechanism: '[____]',
  signatureDate: '[DD/MM/YYYY]',
};

const ZONE_TECHNIQUE: Record<State['zone'], string> = {
  I: 'Zone I (mallet): dermo-tenodesis with 4-0 nylon figure-of-8; DIPJ in extension with extension splint; consider K-wire DIPJ if poor compliance.',
  II: 'Zones II–IV: modified Kessler core with 4-0 braided non-absorbable; epitendinous 6-0 Prolene where tendon caliber allows.',
  III: 'Zones II–IV: modified Kessler core with 4-0 braided non-absorbable; epitendinous 6-0 Prolene where tendon caliber allows. Central slip protected (PIPJ 0° splinting for 6 weeks if disrupted).',
  IV: 'Zones II–IV: modified Kessler core with 4-0 braided non-absorbable; epitendinous 6-0 Prolene where tendon caliber allows.',
  V: 'Zone V repair: 4-strand core (modified Kessler) with 4-0 braided non-absorbable; epitendinous 6-0 Prolene circumferentially.',
  VI: 'Zones V–VIII: 4-strand core (modified Kessler) with 4-0 braided non-absorbable + epitendinous 6-0 Prolene.',
  VII: 'Zones V–VIII: 4-strand core (modified Kessler) with 4-0 braided non-absorbable + epitendinous 6-0 Prolene; retinaculum repaired loosely.',
  VIII:
    'Zones V–VIII: 4-strand core (modified Kessler) with 4-0 braided non-absorbable + epitendinous 6-0 Prolene; musculotendinous junction sutures placed in fascia.',
};

const ZONE_SPLINT: Record<State['zone'], string> = {
  I: 'DIPJ extension splint (Stack / mallet splint) 6–8 weeks; PIPJ free.',
  II: 'Relative motion extension splint; PIPJ included if central slip is at risk.',
  III: 'Volar splint: wrist 30° extension, MCPs 0°, PIPJ 0° × 6 weeks.',
  IV: 'Volar splint: wrist 30° extension, MCPs 0°, PIPJ 0° × 6 weeks if central slip injured.',
  V: 'Volar splint applied: wrist 30° extension, MCP 0°, IPJ free.',
  VI: 'Volar splint: wrist 30° extension, MCPs slight flexion.',
  VII: 'Volar splint: wrist 30° extension; relative motion as therapist directs.',
  VIII: 'Above-elbow volar splint: wrist 30° extension; elbow 90° flexion 3 weeks.',
};

function renderMarkdown(s: State): string {
  return joinSections(
    `# OPERATION NOTE — Extensor tendon repair`,
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
      `Extensor tendon laceration zone ${s.zone} (Verdan extensor zones) of ${s.digit}.`,
    ]),
    `## Consent`,
    `Risks: rupture, extensor lag, swan-neck / boutonnière deformity, adhesion / stiffness, sagittal-band injury and tendon subluxation, infection, need for further surgery. ACC funding discussed.`,
    `## Position / Anaesthesia / Tourniquet`,
    `Supine, arm on hand table. Supraclavicular block. Upper arm tourniquet 250 mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`,
    `## Antibiotics`,
    `Cefazolin 2 g IV at induction.`,
    `## Procedure`,
    numbered([
      `Wound extended longitudinally / dorsal curvilinear incision.`,
      `Tendon ends identified.`,
      ZONE_TECHNIQUE[s.zone],
      s.sagittalBandRepaired
        ? `Sagittal band repaired with 4-0 Vicryl.`
        : `Sagittal band inspected and repaired with 4-0 Vicryl if disrupted.`,
      `Tourniquet down; haemostasis. Skin closed with 4-0 nylon interrupted.`,
      ZONE_SPLINT[s.zone],
    ]),
    `## Findings`,
    bullets([
      `Clean transection of extensor at zone ${s.zone}; sagittal band ${s.sagittalBandRepaired ? 'disrupted (repaired)' : 'intact'}; tendon ends viable.`,
    ]),
    `## Estimated blood loss`,
    `<10 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      `Hand therapy referral within 3 working days; early controlled motion (relative motion / Norwich) protocol.`,
      `Splint 4–6 weeks; gradual return to load over 8–12 weeks.`,
      `Analgesia: paracetamol + NSAID + oxycodone PRN.`,
      `ACC claim lodged.`,
      `Clinic review at 1 and 6 weeks.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function ExtensorTendonRepair() {
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
      downloadName="extensor-tendon-repair"
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
            <span class="opnote-field-label">Digit / location</span>
            <input class="opnote-field-input" type="text" value={state.digit}
              onInput={(e) => update('digit', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Verdan extensor zone</span>
            <select class="opnote-field-select" value={state.zone}
              onChange={(e) => update('zone', (e.currentTarget as HTMLSelectElement).value as State['zone'])}>
              <option value="I">I (DIP)</option>
              <option value="II">II</option>
              <option value="III">III (PIP)</option>
              <option value="IV">IV</option>
              <option value="V">V (MCP)</option>
              <option value="VI">VI (dorsum)</option>
              <option value="VII">VII (wrist retinaculum)</option>
              <option value="VIII">VIII (forearm)</option>
            </select>
          </label>
        </div>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.sagittalBandRepaired}
            onChange={(e) => update('sagittalBandRepaired', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Sagittal band disrupted and repaired</span>
        </label>
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
  slug: 'extensor-tendon-repair',
  title: 'Extensor tendon repair',
  indication:
    'Acute extensor tendon laceration zones I–VIII. Technique morphs by zone (mallet vs digital vs forearm).',
  category: 'hand-trauma' as const,
  emits:
    'Indication · Verdan extensor zone · Zone-specific technique · Sagittal band · Zone-specific splint · ACC claim',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default ExtensorTendonRepair;
