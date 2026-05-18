// Hand laceration + debridement — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  hand-laceration-debridement.md
// Acceptance gate: default-state output must match that file byte-for-byte.
//
// Flat-form template (no toggles morph the structure). Antibiotic prophylaxis
// is the one binary that changes a post-op line — checked → co-amoxiclav 5
// days; unchecked → "No prophylactic antibiotics …".

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered } from './_shared/markdown';

interface State {
  date: string;
  theatre: string;
  start: string;
  end: string;
  assistant: string;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  anaesthesiaType: 'walant' | 'supraclavicular' | 'biers' | 'ga';
  site: string;
  mechanism: string;
  tetanus: 'up-to-date' | 'booster';
  acc45: string;
  accMechanism: string;
  antibioticsRequired: boolean;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  theatre: '[Theatre]',
  start: '[HH:MM]',
  end: '[HH:MM]',
  assistant: '[Registrar Dr ____]',
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: false,
  anaesthesiaType: 'walant',
  site: '[SITE]',
  mechanism: '[mechanism]',
  tetanus: 'up-to-date',
  acc45: '[#########]',
  accMechanism: '[____]',
  antibioticsRequired: false,
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL: Record<State['anaesthesiaType'], string> = {
  walant: 'WALANT',
  supraclavicular: 'Supraclavicular block',
  biers: "Bier's block",
  ga: 'GA',
};

const ANAESTHESIA_PROCEDURE: Record<State['anaesthesiaType'], string> = {
  walant:
    'Supine, arm on hand table. WALANT 1% lignocaine with 1:100,000 adrenaline infiltrated and allowed 25 min. No tourniquet.',
  supraclavicular:
    'Supine, arm on hand table. Supraclavicular block. Upper arm tourniquet 250 mmHg, on [HH:MM] off [HH:MM] = [MM] min.',
  biers:
    "Supine, arm on hand table. Bier's block (IVRA) with 0.5% prilocaine. Upper arm tourniquet 250 mmHg, on [HH:MM] off [HH:MM] = [MM] min.",
  ga: 'Supine, arm on hand table. GA. Upper arm tourniquet 250 mmHg, on [HH:MM] off [HH:MM] = [MM] min.',
};

const TETANUS_LABEL: Record<State['tetanus'], string> = {
  'up-to-date': 'up-to-date',
  booster: 'booster given in ED',
};

function renderMarkdown(s: State): string {
  return joinSections(
    `# OPERATION NOTE — Hand laceration and soft-tissue debridement`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    Acute`,
      `Start: ${s.start}    End: ${s.end}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesiaType]}`
        : `Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesiaType]}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`,
    ].join('\n'),
    `## Diagnosis / Indication`,
    bullets([
      `Hand laceration of ${s.site} from ${s.mechanism}; tetanus status ${TETANUS_LABEL[s.tetanus]}.`,
      `No underlying tendon, nerve, or vessel injury confirmed clinically and intra-operatively.`,
    ]),
    `## Consent`,
    `Risks: bleeding, infection, scar, sensory change, stiffness, need for further surgery if occult injury identified. ACC funding discussed.`,
    `## Position / Anaesthesia`,
    ANAESTHESIA_PROCEDURE[s.anaesthesiaType],
    `## Procedure`,
    numbered([
      `Wound explored to base; foreign body sought; pulsed lavage with 1 L normal saline.`,
      `Necrotic and devitalised tissue debrided sharply.`,
      `All deep structures inspected through full active and passive range of motion — tendons (FDP / FDS / extensors), digital nerves (2-point discrimination intra-op), vascular status, joint capsule.`,
      `Closure: 5-0 nylon interrupted, edges everted; loose if contaminated.`,
      `Dressing: non-adherent + wool / crepe; volar splint as required.`,
    ]),
    `## Findings`,
    bullets([`Clean wound with viable edges; no deep-structure involvement.`]),
    `## Estimated blood loss`,
    `<5 mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      s.antibioticsRequired
        ? `Co-amoxiclav 625 mg tds × 5 days (bite / contaminated / delayed presentation).`
        : `No prophylactic antibiotics (clean mechanism, presented <6 h).`,
      `Elevation; wound check at 48 h with GP or Plastics dressings clinic.`,
      `Sutures out 10–14 days.`,
      `Analgesia: paracetamol; ibuprofen PRN.`,
      `ACC claim lodged.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function HandLacerationDebridement() {
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
      downloadName="hand-laceration-debridement"
      formTitle="Inputs"
    >
      <div class="opnote-section">
        <p class="opnote-section-title">Header</p>
                <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Date of op</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.date}
              onInput={(e) =>
                update('date', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Theatre</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.theatre}
              onInput={(e) =>
                update('theatre', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Start</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.start}
              onInput={(e) =>
                update('start', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">End</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.end}
              onInput={(e) =>
                update('end', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
        </div>
        <label class="opnote-field">
          <span class="opnote-field-label">Assistant</span>
          <input
            class="opnote-field-input"
            type="text"
            value={state.assistant}
            onInput={(e) =>
              update('assistant', (e.currentTarget as HTMLInputElement).value)
            }
          />
        </label>
        <label class="opnote-toggle">
          <input
            type="checkbox"
            checked={state.hasAnaesthetist}
            onChange={(e) =>
              update(
                'hasAnaesthetist',
                (e.currentTarget as HTMLInputElement).checked,
              )
            }
          />
          <span class="opnote-toggle-label">
            Anaesthetist present (uncheck for purely local procedures)
          </span>
        </label>
        {state.hasAnaesthetist && (
          <label class="opnote-field">
            <span class="opnote-field-label">Anaesthetist</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.anaesthetist}
              onInput={(e) =>
                update(
                  'anaesthetist',
                  (e.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </label>
        )}
        <div class="opnote-field">
          <span class="opnote-field-label">Anaesthesia type</span>
          <div
            class="opnote-radio-group opnote-radio-group-cols-2"
            role="radiogroup"
            aria-label="Anaesthesia type"
          >
            {(
              ['walant', 'supraclavicular', 'biers', 'ga'] as const
            ).map((value) => (
              <label class="opnote-radio">
                <input
                  type="radio"
                  name="anaesthesia"
                  value={value}
                  checked={state.anaesthesiaType === value}
                  onChange={() => update('anaesthesiaType', value)}
                />
                <span>{ANAESTHESIA_LABEL[value]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Wound</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Site</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.site}
              onInput={(e) =>
                update('site', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Mechanism</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.mechanism}
              onInput={(e) =>
                update('mechanism', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
        </div>
        <div class="opnote-field">
          <span class="opnote-field-label">Tetanus status</span>
          <div
            class="opnote-radio-group opnote-radio-group-cols-2"
            role="radiogroup"
            aria-label="Tetanus status"
          >
            {(['up-to-date', 'booster'] as const).map((value) => (
              <label class="opnote-radio">
                <input
                  type="radio"
                  name="tetanus"
                  value={value}
                  checked={state.tetanus === value}
                  onChange={() => update('tetanus', value)}
                />
                <span>{TETANUS_LABEL[value]}</span>
              </label>
            ))}
          </div>
        </div>
        <label class="opnote-toggle">
          <input
            type="checkbox"
            checked={state.antibioticsRequired}
            onChange={(e) =>
              update(
                'antibioticsRequired',
                (e.currentTarget as HTMLInputElement).checked,
              )
            }
          />
          <span class="opnote-toggle-label">
            Antibiotic prophylaxis (bite / contaminated / delayed presentation)
          </span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">ACC</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">ACC45 #</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.acc45}
              onInput={(e) =>
                update('acc45', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Mechanism for ACC</span>
            <input
              class="opnote-field-input"
              type="text"
              value={state.accMechanism}
              onInput={(e) =>
                update('accMechanism', (e.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Signature date</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Date of documentation</span>
          <input
            class="opnote-field-input"
            type="text"
            value={state.signatureDate}
            onInput={(e) =>
              update('signatureDate', (e.currentTarget as HTMLInputElement).value)
            }
          />
        </label>
      </div>
    </OperationNoteShell>
  );
}

export const meta = {
  slug: 'hand-laceration-debridement',
  title: 'Hand laceration and soft-tissue debridement',
  indication:
    'Hand laceration explored, debrided, and primarily closed. Excludes deep-structure injury (use the relevant tendon / nerve template instead).',
  category: 'hand-trauma' as const,
  emits:
    'Indication · Consent · Procedure · Findings · Post-op plan · ACC claim',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default HandLacerationDebridement;
