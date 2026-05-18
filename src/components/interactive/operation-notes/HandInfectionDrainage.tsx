// Hand infection drainage — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  hand-infection-drainage.md
//
// Type toggle: PFT / deep space / septic arthritis. Each branch emits its
// own procedure, findings, and post-op plan.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered } from './_shared/markdown';

type InfectionType = 'pft' | 'deep-space' | 'septic-arthritis';

interface State {
  date: string;
  theatre: string;
  start: string;
  end: string;
  assistant: string;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  infectionType: InfectionType;
  digit: string;
  deepSpaceLocation: 'thenar' | 'midpalmar' | 'hypothenar' | 'parona';
  jointLocation: 'MCPJ' | 'PIPJ' | 'DIPJ' | 'wrist';
  kanavelScore: string;
  symptomDays: string;
  wcc: string;
  crp: string;
  empiricalAntibiotic: string;
  michonStage: 'I' | 'II' | 'III';
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
  infectionType: 'pft',
  digit: '[DIGIT]',
  deepSpaceLocation: 'midpalmar',
  jointLocation: 'PIPJ',
  kanavelScore: '[___]',
  symptomDays: '[___]',
  wcc: '[___]',
  crp: '[___]',
  empiricalAntibiotic: 'flucloxacillin',
  michonStage: 'II',
  signatureDate: '[DD/MM/YYYY]',
};

const DEEP_SPACE_LABEL: Record<State['deepSpaceLocation'], string> = {
  thenar: 'thenar',
  midpalmar: 'midpalmar',
  hypothenar: 'hypothenar',
  parona: "Parona's",
};

const MICHON_LABEL: Record<State['michonStage'], string> = {
  I: 'I (serous)',
  II: 'II (purulent)',
  III: 'III (necrotic)',
};

function diagnosisLines(s: State): string[] {
  switch (s.infectionType) {
    case 'pft':
      return [
        `Pyogenic flexor tenosynovitis of ${s.digit} — Kanavel signs (${s.kanavelScore}/4) positive; symptom duration ${s.symptomDays} days.`,
        `Inflammatory markers: WCC ${s.wcc}, CRP ${s.crp}. Empirical ${s.empiricalAntibiotic} started in ED.`,
      ];
    case 'deep-space':
      return [
        `Deep palmar space infection — ${DEEP_SPACE_LABEL[s.deepSpaceLocation]} space.`,
        `Inflammatory markers: WCC ${s.wcc}, CRP ${s.crp}. Empirical ${s.empiricalAntibiotic} started in ED.`,
      ];
    case 'septic-arthritis':
      return [
        `Septic arthritis of ${s.jointLocation} of ${s.digit}.`,
        `Inflammatory markers: WCC ${s.wcc}, CRP ${s.crp}. Empirical ${s.empiricalAntibiotic} started in ED.`,
      ];
  }
}

function procedureBlock(s: State): { title: string; steps: string[] } {
  switch (s.infectionType) {
    case 'pft':
      return {
        title: '## Procedure — Pyogenic flexor tenosynovitis',
        steps: [
          `Bruner zig-zag distal incision over A5 pulley AND proximal transverse incision over A1 pulley.`,
          `Sheath opened at both ends; turbid fluid sampled for MC&S, Gram stain, fungal / AFB.`,
          `16G angiocatheter inserted antegrade through A1 sheath; sheath irrigated with 1 L warmed normal saline until effluent runs clear.`,
          `Michon stage assessed: ${MICHON_LABEL[s.michonStage]}.`,
          s.michonStage === 'III'
            ? `Full Bruner exposure of entire sheath; necrotic synovium debrided; tendon assessed and preserved where viable.`
            : `Distal incision left open with small drain (16G angiocath) sutured at A5; proximal closed loosely with 5-0 nylon.`,
          `Tourniquet down; final lavage; haemostasis.`,
          `Volar splint applied; hand elevated.`,
        ],
      };
    case 'deep-space':
      return {
        title: '## Procedure — Deep palmar space drainage',
        steps: [
          `Approach: ${
            s.deepSpaceLocation === 'thenar'
              ? 'thenar — dorsal + volar "kissing" incisions if pus tracks'
              : s.deepSpaceLocation === 'midpalmar'
                ? 'midpalmar — curvilinear along distal palmar crease, protecting the superficial arch and digital nerves'
                : s.deepSpaceLocation === 'hypothenar'
                  ? 'hypothenar — longitudinal incision over the hypothenar eminence, protecting ulnar nerve and artery'
                  : "Parona's — extended carpal tunnel exposure"
          }.`,
          `Pus drained, cultures (MC&S, Gram stain, fungal / AFB) taken.`,
          `Pulsed lavage with 2 L warmed normal saline.`,
          `Necrotic tissue debrided.`,
          `Wound left open / packed lightly with saline-soaked gauze for delayed closure at 48 h.`,
          `Tourniquet down; final lavage; haemostasis.`,
          `Volar splint applied; hand elevated.`,
        ],
      };
    case 'septic-arthritis':
      return {
        title: '## Procedure — Septic arthritis drainage',
        steps: [
          `Dorsal approach to ${s.jointLocation} of ${s.digit}; capsule opened longitudinally.`,
          `Joint pus / synovial fluid sampled for MC&S, Gram stain, fungal / AFB.`,
          `Synovectomy as required; joint irrigated with 500 mL warmed normal saline.`,
          `Capsule left open or loosely closed; skin loosely interrupted 5-0 nylon.`,
          `Tourniquet down; final lavage; haemostasis.`,
          `Volar splint applied; hand elevated.`,
        ],
      };
  }
}

function postOpLines(s: State): string[] {
  const common = [
    `Admit; IV antibiotics per Microbiology (commonly flucloxacillin 2 g qid; vancomycin if MRSA risk; tazocin if Pasteurella / bite mechanism).`,
  ];
  switch (s.infectionType) {
    case 'pft':
      return [
        ...common,
        `Re-look in theatre at 24–48 h if Michon III or ongoing sepsis.`,
        `Hand therapy referral once infection controlled.`,
        `Daily ward review; CRP / WCC trend.`,
        `ACC claim lodged if penetrating mechanism.`,
      ];
    case 'deep-space':
      return [
        ...common,
        `Re-look in theatre at 48 h for delayed closure or further washout.`,
        `Hand therapy referral once infection controlled.`,
        `Daily ward review; CRP / WCC trend.`,
        `ACC claim lodged if penetrating mechanism.`,
      ];
    case 'septic-arthritis':
      return [
        ...common,
        `Joint immobilised in splint for 7–10 days; gentle active motion once infection controlled.`,
        `Hand therapy referral once infection controlled.`,
        `Daily ward review; CRP / WCC trend.`,
        `ACC claim lodged if penetrating mechanism.`,
      ];
  }
}

function findingsLine(s: State): string {
  switch (s.infectionType) {
    case 'pft':
      return `Michon stage ${s.michonStage === 'I' ? 'I (serous)' : s.michonStage === 'II' ? 'II tenosynovitis; sheath intact; tendon viable' : 'III with necrotic synovium; sheath compromised'}.`;
    case 'deep-space':
      return `Frank pus drained from ${DEEP_SPACE_LABEL[s.deepSpaceLocation]} space; no extension to adjacent compartments identified.`;
    case 'septic-arthritis':
      return `Purulent synovial fluid drained from ${s.jointLocation} of ${s.digit}; articular cartilage grossly preserved.`;
  }
}

function renderMarkdown(s: State): string {
  const proc = procedureBlock(s);
  return joinSections(
    `# OPERATION NOTE — Hand infection drainage`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    Acute`,
      `Start: ${s.start}    End: ${s.end}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: GA`
        : `Anaesthetic: GA`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
    ].join('\n'),
    `## Diagnosis / Indication`,
    bullets(diagnosisLines(s)),
    `## Consent`,
    `Risks: stiffness, tendon adhesion / rupture, amputation (severe cases), recurrence requiring further washout, sensory or motor deficit, CRPS, scar.`,
    `## Position / Anaesthesia / Tourniquet`,
    `Supine, arm on hand table. GA. Exsanguinate by elevation (Esmarch avoided in infection); upper arm tourniquet 250 mmHg.`,
    `## Antibiotics`,
    `Empirical antibiotics held until intra-operative cultures taken, then resumed.`,
    proc.title,
    numbered(proc.steps),
    `## Findings`,
    bullets([findingsLine(s)]),
    `## Estimated blood loss`,
    `<10 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets(postOpLines(s)),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function HandInfectionDrainage() {
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
      downloadName="hand-infection-drainage"
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
        <p class="opnote-section-title">Infection type</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Diagnosis</span>
          <div class="opnote-radio-group opnote-radio-group-cols-3" role="radiogroup" aria-label="Infection type">
            <label class="opnote-radio">
              <input type="radio" name="type" value="pft" checked={state.infectionType === 'pft'}
                onChange={() => update('infectionType', 'pft')} />
              <span>Pyogenic flexor tenosynovitis</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="type" value="deep-space" checked={state.infectionType === 'deep-space'}
                onChange={() => update('infectionType', 'deep-space')} />
              <span>Deep palmar space</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="type" value="septic-arthritis" checked={state.infectionType === 'septic-arthritis'}
                onChange={() => update('infectionType', 'septic-arthritis')} />
              <span>Septic arthritis</span>
            </label>
          </div>
        </div>

        {state.infectionType === 'pft' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">PFT details</p>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Digit</span>
                <input class="opnote-field-input" type="text" value={state.digit}
                  onInput={(e) => update('digit', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Michon stage</span>
                <select class="opnote-field-select" value={state.michonStage}
                  onChange={(e) => update('michonStage', (e.currentTarget as HTMLSelectElement).value as State['michonStage'])}>
                  <option value="I">I (serous)</option>
                  <option value="II">II (purulent)</option>
                  <option value="III">III (necrotic)</option>
                </select>
              </label>
            </div>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Kanavel signs (/4)</span>
                <input class="opnote-field-input" type="text" value={state.kanavelScore}
                  onInput={(e) => update('kanavelScore', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Symptom duration (days)</span>
                <input class="opnote-field-input" type="text" value={state.symptomDays}
                  onInput={(e) => update('symptomDays', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
          </div>
        )}

        {state.infectionType === 'deep-space' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Deep space details</p>
            <label class="opnote-field">
              <span class="opnote-field-label">Location</span>
              <select class="opnote-field-select" value={state.deepSpaceLocation}
                onChange={(e) => update('deepSpaceLocation', (e.currentTarget as HTMLSelectElement).value as State['deepSpaceLocation'])}>
                <option value="thenar">Thenar</option>
                <option value="midpalmar">Midpalmar</option>
                <option value="hypothenar">Hypothenar</option>
                <option value="parona">Parona's</option>
              </select>
            </label>
          </div>
        )}

        {state.infectionType === 'septic-arthritis' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Septic arthritis details</p>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Joint</span>
                <select class="opnote-field-select" value={state.jointLocation}
                  onChange={(e) => update('jointLocation', (e.currentTarget as HTMLSelectElement).value as State['jointLocation'])}>
                  <option value="MCPJ">MCPJ</option>
                  <option value="PIPJ">PIPJ</option>
                  <option value="DIPJ">DIPJ</option>
                  <option value="wrist">Wrist</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Digit</span>
                <input class="opnote-field-input" type="text" value={state.digit}
                  onInput={(e) => update('digit', (e.currentTarget as HTMLInputElement).value)} />
              </label>
            </div>
          </div>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Inflammatory markers</p>
        <div class="opnote-row opnote-row-3">
          <label class="opnote-field">
            <span class="opnote-field-label">WCC</span>
            <input class="opnote-field-input" type="text" value={state.wcc}
              onInput={(e) => update('wcc', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">CRP</span>
            <input class="opnote-field-input" type="text" value={state.crp}
              onInput={(e) => update('crp', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Empirical antibiotic</span>
            <input class="opnote-field-input" type="text" value={state.empiricalAntibiotic}
              onInput={(e) => update('empiricalAntibiotic', (e.currentTarget as HTMLInputElement).value)} />
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
  slug: 'hand-infection-drainage',
  title: 'Hand infection drainage',
  indication:
    'Surgical drainage of hand-space infection. Type toggle: pyogenic flexor tenosynovitis / deep palmar space / septic arthritis.',
  category: 'hand-trauma' as const,
  emits:
    'Diagnosis · Type-specific approach · Cultures · Lavage · Splint · IV antibiotic plan · Re-look plan',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default HandInfectionDrainage;
