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

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, ifSection } from './_shared/markdown';

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

interface Lesion {
  site: string;
  size: string;
  pathology: Pathology;
  margin: string;
  closureType: ClosureType;
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
  theatre: string;
  classification: 'Elective' | 'Acute';
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  anaesthesiaType: AnaesthesiaType;
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
  theatre: '[Theatre]',
  classification: 'Elective',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: false,
  anaesthesiaType: 'local',
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
  followUp: 'Plastics clinic 2 weeks (suture removal) and 6 weeks (with histology)',
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
  local:
    'Local infiltration of 1% lignocaine with 1:100,000 adrenaline, allowed 7 min for vasoconstriction.',
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
        `Closure: deep dermal 4-0 Monocryl interrupted; skin 5-0 nylon interrupted.`,
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
        `Donor closed primarily; flap inset with 4-0 Monocryl deep dermal and 5-0 nylon skin.`,
      ];
  }
}

function postOpPlan(s: State): string[] {
  const lines: string[] = [
    `Keep dressing dry 48 h; elevate where applicable.`,
    `Analgesia: regular paracetamol; ibuprofen PRN.`,
  ];
  const anyFtsg = s.lesions.some((l) => l.closureType === 'ftsg');
  const anyStsg = s.lesions.some((l) => l.closureType === 'stsg');
  const anyStsgNpwt = s.lesions.some(
    (l) => l.closureType === 'stsg' && l.stsgNPWT,
  );
  if (anyFtsg) lines.push(`Tie-over bolster down at 7 days.`);
  if (anyStsg)
    lines.push(
      `${anyStsgNpwt ? 'NPWT' : 'Bolster'} down at 5–7 days; donor occlusive dressing until saturated.`,
    );
  lines.push(`Sutures out: face 5–7 days; trunk/limb 10–14 days.`);
  lines.push(`Histology review at clinic.`);
  lines.push(`Follow-up: ${s.followUp}.`);
  if (s.accClaim) lines.push(`ACC claim ${s.acc45} lodged.`);
  if (s.extraNotes) lines.push(s.extraNotes);
  const anyMalignant = s.lesions.some(
    (l) =>
      l.pathology === 'BCC' ||
      l.pathology === 'SCC' ||
      l.pathology === 'SCC in situ (Bowen)',
  );
  if (anyMalignant) lines.push(`GP letter to be sent.`);
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
    return `"${l.site} lesion${suffix} — ${l.specimenOrientation}" → Histology.`;
  });

  return joinSections(
    `# OPERATION NOTE — Skin lesion excision`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    ${s.classification}`,
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
    `Supine; 0.5% chlorhexidine in alcohol (aqueous if facial / near eye); standard drape.`,
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
    s.ebl,
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
  const [state, setState] = useState<State>(INITIAL_STATE);
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
  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="skin-lesion-excision"
      formTitle="Inputs"
    >
      <div class="opnote-section">
        <p class="opnote-section-title">Header</p>
        <div class="opnote-row opnote-row-3">
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
          <span class="opnote-field-label">Follow-up</span>
          <input class="opnote-field-input" type="text" value={state.followUp}
            onInput={(e) => update('followUp', (e.currentTarget as HTMLInputElement).value)} />
        </label>
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
    'Indication · Per-lesion pathology and margin · Per-lesion closure procedure · Per-lesion specimen orientation · Shared post-op plan',
  lastReviewed: '2026-05-19',
  version: '1.1',
};

export default SkinLesionExcision;
