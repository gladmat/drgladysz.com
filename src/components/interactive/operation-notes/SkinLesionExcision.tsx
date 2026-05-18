// Skin lesion excision — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  skin-lesion-excision.md
//
// Closure-type toggle morphs the procedure, consent risks, and post-op plan
// (covers the A1–A4 variants in the locked brief: direct / FTSG / STSG /
// local flap).

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

interface State {
  patientName: string;
  nhi: string;
  dob: string;
  date: string;
  theatre: string;
  start: string;
  end: string;
  classification: 'Elective' | 'Acute';
  assistant: string;
  anaesthetist: string;
  anaesthesiaType: AnaesthesiaType;
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
  tourniquetUsed: boolean;
  tourniquetPressure: string;
  tourniquetOn: string;
  tourniquetOff: string;
  antibioticsGiven: boolean;
  antibioticDrug: string;
  specimenOrientation: string;
  ebl: string;
  accClaim: boolean;
  acc45: string;
  accMechanism: string;
  followUp: string;
  extraNotes: string;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  patientName: '[PATIENT NAME]',
  nhi: '[NHI]',
  dob: '[DD/MM/YYYY]',
  date: '[DD/MM/YYYY]',
  theatre: '[Theatre]',
  start: '[HH:MM]',
  end: '[HH:MM]',
  classification: 'Elective',
  assistant: '[Registrar Dr ____]',
  anaesthetist: '[Dr ____]',
  anaesthesiaType: 'local',
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
  tourniquetUsed: false,
  tourniquetPressure: '250',
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  antibioticsGiven: false,
  antibioticDrug: 'Cefazolin 2 g IV at induction',
  specimenOrientation: 'short = superior, long = lateral',
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

const CLOSURE_EXTRA_RISKS: Record<ClosureType, string> = {
  direct: '',
  ftsg: ', graft failure, donor-site scar, pigmentary mismatch',
  stsg: ', graft failure, donor-site pain and slow healing 14–21 d, mesh pattern visible if meshed',
  flap: ', flap necrosis, trapdoor deformity, dog-ear, pincushioning',
};

function procedureSteps(s: State): string[] {
  const common = [
    `Lesion marked with ${s.margin} mm clinical margin; ${s.closureType === 'direct' ? 'ellipse oriented along RSTL with ~3:1 length-to-width ratio' : 'orientation along RSTL'}.`,
    `Skin incised with #15 blade; ${s.closureType === 'direct' ? 'ellipse excised en bloc to deep subcutis' : 'lesion excised en bloc to deep subcutis'}.`,
    `Orientation suture placed: ${s.specimenOrientation}. Specimen sent in formalin for histology.`,
    `Haemostasis: bipolar diathermy; wound irrigated with normal saline.`,
  ];
  switch (s.closureType) {
    case 'direct':
      return [
        ...common,
        `Wide subdermal undermining as required to mobilise edges.`,
        `Closure: deep dermal 4-0 Monocryl interrupted; skin 5-0 nylon interrupted.`,
      ];
    case 'ftsg':
      return [
        ...common,
        `Defect templated; donor site: ${s.ftsgDonor}.`,
        `FTSG harvested, defatted, inset with 5-0 nylon interrupted; tie-over bolster placed (Jelonet + saline-soaked cotton wool + 4-0 silk anchor sutures).`,
        `Donor closed primarily: 4-0 Monocryl deep dermal; 5-0 nylon skin.`,
      ];
    case 'stsg':
      return [
        ...common,
        `STSG harvested from ${s.stsgDonor} with Zimmer dermatome at ${s.stsgThickness} inch.`,
        `Graft ${s.stsgMeshed ? 'meshed 1:1.5 with mesher' : 'left as sheet, fenestrated'}; inset with skin staples; ${s.stsgNPWT ? 'NPWT at -75 mmHg' : 'tie-over bolster'} for 5–7 days.`,
        `Donor site dressed with Mepitel One + Mepore.`,
      ];
    case 'flap':
      return [
        ...common,
        `${s.flapType} flap designed, elevated in subcutaneous plane, transposed / advanced to defect.`,
        `Donor closed primarily; flap inset with 4-0 Monocryl deep dermal and 5-0 nylon skin.`,
      ];
  }
}

function postOpPlan(s: State): string[] {
  const lines: string[] = [
    `Keep dressing dry 48 h; elevate where applicable.`,
    `Analgesia: regular paracetamol; ibuprofen PRN.`,
  ];
  if (s.closureType === 'ftsg') {
    lines.push(`Tie-over bolster down at 7 days.`);
  }
  if (s.closureType === 'stsg') {
    lines.push(
      `${s.stsgNPWT ? 'NPWT' : 'Bolster'} down at 5–7 days; donor occlusive dressing until saturated.`,
    );
  }
  lines.push(`Sutures out: face 5–7 days; trunk/limb 10–14 days.`);
  lines.push(`Histology review at clinic.`);
  lines.push(`Follow-up: ${s.followUp}.`);
  if (s.accClaim) lines.push(`ACC claim ${s.acc45} lodged.`);
  if (s.extraNotes) lines.push(s.extraNotes);
  if (
    s.pathology === 'BCC' ||
    s.pathology === 'SCC' ||
    s.pathology === 'SCC in situ (Bowen)'
  ) {
    lines.push(`GP letter to be sent.`);
  }
  return lines;
}

function renderMarkdown(s: State): string {
  return joinSections(
    `# OPERATION NOTE — Skin lesion excision`,
    [
      `Patient: ${s.patientName}    NHI: ${s.nhi}    DOB: ${s.dob}`,
      `Date: ${s.date}    Theatre: ${s.theatre}    ${s.classification}`,
      `Start: ${s.start}    End: ${s.end}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      `Assistant: ${s.assistant}`,
      `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesiaType]}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      ifSection(
        s.accClaim,
        `ACC45 #: ${s.acc45} — mechanism: ${s.accMechanism}.`,
      ),
    ]
      .filter(Boolean)
      .join('\n'),
    `## Diagnosis / Indication`,
    bullets([
      `${s.pathology} of ${s.site}, ${s.size} mm.`,
      `Plan: Excision with ${s.margin} mm clinical margin and ${CLOSURE_PLAN_LABEL[s.closureType]}.`,
    ]),
    `## Consent`,
    `Risks discussed: bleeding, haematoma, infection, scar, recurrence, incomplete excision requiring re-excision, sensory change, dehiscence, asymmetry, suture reaction${CLOSURE_EXTRA_RISKS[s.closureType]}.`,
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
    numbered(procedureSteps(s)),
    `## Findings`,
    bullets([
      `${s.pathology} ${s.size} mm at ${s.site}; clinically clear margins; no deep invasion observed.`,
    ]),
    `## Specimens`,
    bullets([`"${s.site} lesion — ${s.specimenOrientation}" → Histology.`]),
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
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Patient name</span>
            <input class="opnote-field-input" type="text" value={state.patientName}
              onInput={(e) => update('patientName', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">NHI</span>
            <input class="opnote-field-input" type="text" value={state.nhi}
              onInput={(e) => update('nhi', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-3">
          <label class="opnote-field">
            <span class="opnote-field-label">DOB</span>
            <input class="opnote-field-input" type="text" value={state.dob}
              onInput={(e) => update('dob', (e.currentTarget as HTMLInputElement).value)} />
          </label>
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
        <div class="opnote-row opnote-row-3">
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
          <label class="opnote-field">
            <span class="opnote-field-label">Classification</span>
            <select class="opnote-field-select" value={state.classification}
              onChange={(e) => update('classification', (e.currentTarget as HTMLSelectElement).value as State['classification'])}>
              <option value="Elective">Elective</option>
              <option value="Acute">Acute</option>
            </select>
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Assistant</span>
            <input class="opnote-field-input" type="text" value={state.assistant}
              onInput={(e) => update('assistant', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Anaesthetist</span>
            <input class="opnote-field-input" type="text" value={state.anaesthetist}
              onInput={(e) => update('anaesthetist', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
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
        <p class="opnote-section-title">Lesion</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Site</span>
            <input class="opnote-field-input" type="text" value={state.site}
              onInput={(e) => update('site', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Size (mm)</span>
            <input class="opnote-field-input" type="text" value={state.size}
              onInput={(e) => update('size', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Suspected pathology</span>
            <select class="opnote-field-select" value={state.pathology}
              onChange={(e) => update('pathology', (e.currentTarget as HTMLSelectElement).value as Pathology)}>
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
            <input class="opnote-field-input" type="text" value={state.margin}
              onInput={(e) => update('margin', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Closure</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Closure type</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Closure type">
            {(['direct', 'ftsg', 'stsg', 'flap'] as const).map((v) => (
              <label class="opnote-radio">
                <input type="radio" name="closure" value={v} checked={state.closureType === v}
                  onChange={() => update('closureType', v)} />
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

        {state.closureType === 'ftsg' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">FTSG donor site</p>
            <label class="opnote-field">
              <span class="opnote-field-label">Donor site</span>
              <select class="opnote-field-select" value={state.ftsgDonor}
                onChange={(e) => update('ftsgDonor', (e.currentTarget as HTMLSelectElement).value as FtsgDonor)}>
                <option value="Pre-auricular">Pre-auricular</option>
                <option value="Post-auricular">Post-auricular</option>
                <option value="Supraclavicular">Supraclavicular</option>
                <option value="Upper inner arm">Upper inner arm</option>
                <option value="Groin">Groin</option>
              </select>
            </label>
          </div>
        )}

        {state.closureType === 'stsg' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">STSG</p>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Donor site</span>
                <select class="opnote-field-select" value={state.stsgDonor}
                  onChange={(e) => update('stsgDonor', (e.currentTarget as HTMLSelectElement).value as StsgDonor)}>
                  <option value="Anterolateral thigh">Anterolateral thigh</option>
                  <option value="Buttock">Buttock</option>
                </select>
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Thickness (inch)</span>
                <select class="opnote-field-select" value={state.stsgThickness}
                  onChange={(e) => update('stsgThickness', (e.currentTarget as HTMLSelectElement).value as State['stsgThickness'])}>
                  <option value="0.008">0.008</option>
                  <option value="0.010">0.010</option>
                  <option value="0.012">0.012</option>
                </select>
              </label>
            </div>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.stsgMeshed}
                onChange={(e) => update('stsgMeshed', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">Meshed 1:1.5</span>
            </label>
            <label class="opnote-toggle">
              <input type="checkbox" checked={state.stsgNPWT}
                onChange={(e) => update('stsgNPWT', (e.currentTarget as HTMLInputElement).checked)} />
              <span class="opnote-toggle-label">NPWT bolster (vs tie-over)</span>
            </label>
          </div>
        )}

        {state.closureType === 'flap' && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Flap type</p>
            <label class="opnote-field">
              <span class="opnote-field-label">Flap design</span>
              <select class="opnote-field-select" value={state.flapType}
                onChange={(e) => update('flapType', (e.currentTarget as HTMLSelectElement).value as FlapType)}>
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
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Estimated blood loss</span>
            <input class="opnote-field-input" type="text" value={state.ebl}
              onInput={(e) => update('ebl', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Specimen orientation</span>
            <input class="opnote-field-input" type="text" value={state.specimenOrientation}
              onInput={(e) => update('specimenOrientation', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
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
    'Excision of benign or malignant cutaneous lesion. Closure morphs by selection: direct / FTSG / STSG / local flap.',
  category: 'skin-soft-tissue' as const,
  emits:
    'Indication · Pathology · Margin · Closure-specific procedure · Specimen orientation · Histology · Follow-up',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default SkinLesionExcision;
