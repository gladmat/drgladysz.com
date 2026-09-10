// General operation note — bare skeleton for any procedure.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  general-operation-note.md
//
// The section spine is fixed (RCS Good Surgical Practice 2014 §1.3, the
// same spine every dedicated template uses); the content inside it is
// free text, one bullet or step per line. What is still generated rather
// than typed: the header, the standard consent risk list with switchable
// risk groups, the position / anaesthesia / tourniquet line, the
// antibiotic + VTE line, the implant traceability line, and the post-op
// bullets that follow from a toggle (suture material, specimens, implants,
// ACC). Same site-driven rules as the other templates: the anaesthetist
// line resolves from the anaesthetic, WALANT removes the tourniquet, and
// suture material decides whether a removal bullet exists.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, todayNZ } from './_shared/markdown';

type Classification = 'Elective' | 'Acute';
type Anaesthesia = 'local' | 'walant' | 'regional' | 'ga' | 'combined' | 'sedation';
type AnaesthetistMode = 'auto' | 'present' | 'absent';
type Position = 'supine' | 'handtable' | 'prone' | 'lateral' | 'lithotomy' | 'custom';
type Prep = 'chlorhexidine' | 'betadine' | 'custom';
type TourniquetSite = 'upper arm' | 'forearm' | 'thigh' | 'calf';
type Antibiotic = 'nil' | 'cefazolin2' | 'cefazolin3' | 'clindamycin' | 'custom';
type Vte = 'daycase' | 'mechanical' | 'pharmacological';
type Sutures = 'nonabsorbable' | 'absorbable' | 'none';

interface State {
  procedure: string;
  date: string;
  classification: Classification;
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  anaesthetistMode: AnaesthetistMode;
  anaesthesia: Anaesthesia;
  localAgent: string;
  localVolume: string;
  blockName: string;
  acc: boolean;
  accNumber: string;
  accDescription: string;
  diagnosis: string;
  riskHand: boolean;
  riskSkin: boolean;
  riskImplant: boolean;
  riskFlap: boolean;
  riskNerve: boolean;
  riskBone: boolean;
  specificRisks: string;
  alternatives: string;
  interpreter: boolean;
  interpreterLanguage: string;
  position: Position;
  positionCustom: string;
  prep: Prep;
  prepCustom: string;
  tourniquet: boolean;
  tourniquetSite: TourniquetSite;
  tourniquetPressure: string;
  tourniquetOn: string;
  tourniquetOff: string;
  tourniquetTime: string;
  antibiotic: Antibiotic;
  antibioticCustom: string;
  vte: Vte;
  steps: string;
  hasImplants: boolean;
  implantSystem: string;
  implants: string;
  hasSpecimens: boolean;
  specimens: string;
  findings: string;
  bloodLoss: string;
  complications: string;
  sutures: Sutures;
  sutureDays: string;
  postOp: string;
  followUpWeeks: string;
  signatureDate: string;
}

const DEFAULT_STEPS = [
  '[Incision — site, length, orientation; marked before infiltration]',
  '[Exposure — planes developed; structures identified and protected]',
  '[Definitive procedure — what was done and how]',
  '[Haemostasis — bipolar diathermy; saline irrigation]',
  '[Closure — layers and suture materials]',
  '[Dressing / splint]',
].join('\n');

const DEFAULT_POSTOP = [
  '[Mobilisation — elevation, weight-bearing or range-of-motion instructions]',
  'Analgesia: paracetamol + NSAID regularly; [rescue analgesic] if required.',
  'Wound care: dressing kept dry and intact for 48 h, then [dressing plan].',
  '{sutures}',
  'Return advice: increasing pain, swelling, redness, discharge or fever — present to GP or ED.',
  '[Driving, work and activity restrictions]',
].join('\n');

const INITIAL_STATE: State = {
  procedure: '[Procedure]',
  date: '[DD/MM/YYYY]',
  classification: 'Elective',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  anaesthetistMode: 'auto',
  anaesthesia: 'ga',
  localAgent: '1% lignocaine with 1:100,000 adrenaline',
  localVolume: '[__]',
  blockName: '[block]',
  acc: false,
  accNumber: '[#########]',
  accDescription: '[mechanism / claim type]',
  diagnosis: [
    '[Diagnosis — side, site, stage or classification]',
    '[Indication — symptoms, duration, investigations, failed conservative management]',
  ].join('\n'),
  riskHand: false,
  riskSkin: false,
  riskImplant: false,
  riskFlap: false,
  riskNerve: false,
  riskBone: false,
  specificRisks: '[Procedure-specific risks]',
  alternatives: '[alternatives, including no treatment]',
  interpreter: false,
  interpreterLanguage: '[language]',
  position: 'supine',
  positionCustom: '[Position]',
  prep: 'chlorhexidine',
  prepCustom: '[prep agent]',
  tourniquet: false,
  tourniquetSite: 'upper arm',
  tourniquetPressure: '250',
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  antibiotic: 'nil',
  antibioticCustom: '[Agent, dose] IV',
  vte: 'daycase',
  steps: DEFAULT_STEPS,
  hasImplants: false,
  implantSystem: '[Manufacturer, implant system]',
  implants: '[Component — size — REF [________] — LOT [________]]',
  hasSpecimens: false,
  specimens: '[Specimen — site, orientation marker] — histology.',
  findings:
    '[Findings — confirmed diagnosis, unexpected findings, condition of adjacent structures]',
  bloodLoss: '[___] mL.',
  complications: 'Nil intra-operative.',
  sutures: 'nonabsorbable',
  sutureDays: '[___]',
  postOp: DEFAULT_POSTOP,
  followUpWeeks: '[___]',
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL: Record<Anaesthesia, string> = {
  local: 'Local infiltration',
  walant: 'WALANT',
  regional: 'Regional block',
  ga: 'GA',
  combined: 'GA + regional block',
  sedation: 'Sedation + local',
};

const POSITION_LABEL: Record<Exclude<Position, 'custom'>, string> = {
  supine: 'Supine',
  handtable: 'Supine, arm on hand table',
  prone: 'Prone',
  lateral: 'Lateral',
  lithotomy: 'Lithotomy',
};

const VTE_LINE: Record<Vte, string> = {
  daycase:
    'VTE: mechanical measures only — day-case procedure with immediate mobilisation; pharmacological prophylaxis not indicated.',
  mechanical:
    'VTE: risk assessment completed — anti-embolism stockings and intermittent pneumatic compression; pharmacological prophylaxis not indicated.',
  pharmacological:
    'VTE: risk assessment completed — anti-embolism stockings, intermittent pneumatic compression, and enoxaparin 40 mg subcutaneously daily from 6 h post-operatively until fully mobile.',
};

const RISK_GROUPS: { key: keyof State; label: string; text: string }[] = [
  {
    key: 'riskHand',
    label: 'Hand / upper limb — stiffness, cold intolerance, CRPS, tendon adhesion',
    text: 'stiffness, cold intolerance, CRPS, tendon adhesion',
  },
  {
    key: 'riskSkin',
    label: 'Skin / oncological — positive margins, local recurrence, contour deformity',
    text: 'incomplete excision requiring re-excision, local recurrence, contour deformity',
  },
  {
    key: 'riskImplant',
    label: 'Implant — loosening, dislocation, wear, infection requiring removal',
    text: 'implant loosening, dislocation, wear or breakage, implant infection requiring removal, revision surgery',
  },
  {
    key: 'riskFlap',
    label: 'Flap / graft — partial or total loss, donor-site morbidity',
    text: 'partial or complete flap or graft loss, donor-site pain and scarring, need for further procedures',
  },
  {
    key: 'riskNerve',
    label: 'Nerve — incomplete recovery, neuroma, persistent symptoms',
    text: 'incomplete recovery of sensation or power, neuroma, persistent symptoms',
  },
  {
    key: 'riskBone',
    label: 'Bone / fracture — non-union, malunion, metalwork problems',
    text: 'delayed union, non-union, malunion, metalwork prominence or failure, need for metalwork removal',
  },
];

const STANDARD_RISKS =
  'bleeding and haematoma, infection, delayed wound healing, scarring (including hypertrophic or keloid scar), persistent pain, numbness or altered sensation around the scar, injury to adjacent nerves, vessels or tendons, incomplete relief or recurrence, need for further surgery, anaesthetic risks';

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function usesTourniquet(s: State): boolean {
  return s.tourniquet && s.anaesthesia !== 'walant';
}

function anaesthetistPresent(s: State): boolean {
  if (s.anaesthetistMode !== 'auto') return s.anaesthetistMode === 'present';
  return s.anaesthesia !== 'local' && s.anaesthesia !== 'walant';
}

function anaesthesiaSentence(s: State): string {
  const local = `${s.localAgent}, ${s.localVolume} mL`;
  switch (s.anaesthesia) {
    case 'local':
      return `Local infiltration of ${local}.`;
    case 'walant':
      return `WALANT: 1% lignocaine with 1:100,000 adrenaline buffered 10:1 with 8.4% sodium bicarbonate, ${s.localVolume} mL; allowed 25 min for vasoconstriction.`;
    case 'regional':
      return `Regional block (anaesthetist): ${s.blockName}.`;
    case 'ga':
      return `General anaesthesia.`;
    case 'combined':
      return `General anaesthesia with regional block (${s.blockName}) for post-operative analgesia.`;
    case 'sedation':
      return `Sedation (anaesthetist) with local infiltration of ${local}.`;
  }
}

function prepPhrase(s: State): string {
  if (s.prep === 'chlorhexidine') return '0.5% chlorhexidine in alcohol';
  if (s.prep === 'betadine') return 'povidone-iodine (Betadine) 10% aqueous';
  return s.prepCustom;
}

function positionLine(s: State): string {
  const position =
    s.position === 'custom' ? s.positionCustom : POSITION_LABEL[s.position];
  const tourniquet = usesTourniquet(s)
    ? `${s.tourniquetSite.charAt(0).toUpperCase()}${s.tourniquetSite.slice(1)} tourniquet ${s.tourniquetPressure} mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`
    : 'No tourniquet.';
  return `${position}. ${anaesthesiaSentence(s)} Skin prep ${prepPhrase(s)}; standard drape. ${tourniquet}`;
}

function antibioticLine(s: State): string {
  const agent =
    s.antibiotic === 'nil'
      ? 'Nil — clean procedure without implant; prophylaxis not indicated.'
      : s.antibiotic === 'cefazolin2'
        ? 'Cefazolin 2 g IV at induction (3 g if ≥120 kg); single dose.'
        : s.antibiotic === 'cefazolin3'
          ? 'Cefazolin 3 g IV at induction (≥120 kg); single dose.'
          : s.antibiotic === 'clindamycin'
            ? 'Clindamycin 600 mg IV at induction (β-lactam anaphylaxis); single dose.'
            : `${s.antibioticCustom} at induction; single dose.`;
  const timing =
    s.antibiotic !== 'nil' && usesTourniquet(s)
      ? ' Infusion completed before tourniquet inflation.'
      : '';
  return `${agent}${timing} ${VTE_LINE[s.vte]}`;
}

function consentParagraph(s: State): string {
  const groups = RISK_GROUPS.filter((g) => s[g.key]).map((g) => g.text);
  const risks = [STANDARD_RISKS, ...groups].join(', ');
  const specific = s.specificRisks.trim();
  const interpreter = s.interpreter
    ? ` Interpreter present (${s.interpreterLanguage}).`
    : '';
  return `Risks discussed: ${risks}.${specific ? ` ${specific.replace(/\.$/, '')}.` : ''} Alternatives (${s.alternatives}) discussed.${interpreter} Written consent obtained.`;
}

function sutureBullet(s: State): string {
  switch (s.sutures) {
    case 'nonabsorbable':
      return `Sutures out at ${s.sutureDays} days.`;
    case 'absorbable':
      return `Absorbable sutures — nothing to remove; wound check at ${s.sutureDays} days.`;
    case 'none':
      return `No sutures — skin closed with glue / adhesive strips; wound check at ${s.sutureDays} days.`;
  }
}

function postOpLines(s: State): string[] {
  const typed = lines(s.postOp).map((l) =>
    l === '{sutures}' ? sutureBullet(s) : l,
  );
  return [
    ...typed,
    s.hasSpecimens && `Histology to be reviewed at clinic.`,
    s.hasImplants &&
      `Implant card completed and given to the patient; implant labels in the clinical record.`,
    s.acc && `ACC claim lodged.`,
    `Clinic review at ${s.followUpWeeks} weeks.`,
  ].filter((l): l is string => Boolean(l));
}

function renderMarkdown(s: State): string {
  return joinSections(
    `# OPERATION NOTE — ${s.procedure}`,
    [
      `Date: ${s.date}    ${s.classification}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      anaesthetistPresent(s)
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesia]}`
        : `Anaesthetic: ${ANAESTHESIA_LABEL[s.anaesthesia]}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      s.acc && `ACC45 #: ${s.accNumber} — ${s.accDescription}.`,
    ]
      .filter(Boolean)
      .join('\n'),
    `## Diagnosis / Indication`,
    bullets(lines(s.diagnosis)),
    `## Consent`,
    consentParagraph(s),
    `## Position / Anaesthesia / Tourniquet`,
    positionLine(s),
    `## Antibiotics / VTE prophylaxis`,
    antibioticLine(s),
    `## Procedure — ${s.procedure}`,
    numbered(lines(s.steps)),
    s.hasImplants && `## Implants`,
    s.hasImplants &&
      `${s.implantSystem} — implant labels affixed to the implant record; REF / LOT / UDI recorded.`,
    s.hasImplants && bullets(lines(s.implants)),
    `## Specimens`,
    s.hasSpecimens ? bullets(lines(s.specimens)) : `Nil.`,
    `## Findings`,
    bullets(lines(s.findings)),
    `## Estimated blood loss`,
    s.bloodLoss,
    `## Complications`,
    s.complications,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets(postOpLines(s)),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function GeneralOperationNote() {
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
  const reset = useCallback(
    () =>
      setState({ ...INITIAL_STATE, date: todayNZ(), signatureDate: todayNZ() }),
    [],
  );

  const present = anaesthetistPresent(state);
  const localUsed =
    state.anaesthesia === 'local' ||
    state.anaesthesia === 'walant' ||
    state.anaesthesia === 'sedation';
  const blockUsed =
    state.anaesthesia === 'regional' || state.anaesthesia === 'combined';

  const text = (key: keyof State, label: string, hint?: string) => (
    <label class="opnote-field">
      <span class="opnote-field-label">{label}</span>
      <input class="opnote-field-input" type="text" value={state[key] as string}
        onInput={(e) => update(key, (e.currentTarget as HTMLInputElement).value as State[typeof key])} />
      {hint && <span class="opnote-field-hint">{hint}</span>}
    </label>
  );

  const area = (key: keyof State, label: string, hint: string) => (
    <label class="opnote-field">
      <span class="opnote-field-label">{label}</span>
      <textarea class="opnote-field-textarea" rows={4} value={state[key] as string}
        onInput={(e) => update(key, (e.currentTarget as HTMLTextAreaElement).value as State[typeof key])} />
      <span class="opnote-field-hint">{hint}</span>
    </label>
  );

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="operation-note"
      formTitle="Inputs"
    >
      <div class="opnote-section">
        <p class="opnote-section-title">Header</p>
        {text('procedure', 'Procedure', 'Fills the title and the Procedure heading.')}
        <div class="opnote-row opnote-row-2">
          {text('date', 'Date of op')}
          <label class="opnote-field">
            <span class="opnote-field-label">Classification</span>
            <select class="opnote-field-select" value={state.classification}
              onChange={(e) => update('classification', (e.currentTarget as HTMLSelectElement).value as Classification)}>
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
        {state.hasAssistant && text('assistant', 'Assistant')}
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.acc}
            onChange={(e) => update('acc', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">ACC claim</span>
        </label>
        {state.acc && (
          <div class="opnote-row opnote-row-2">
            {text('accNumber', 'ACC45 number')}
            {text('accDescription', 'Mechanism / claim type')}
          </div>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Diagnosis / Indication</p>
        {area('diagnosis', 'Bullets', 'One bullet per line.')}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Consent</p>
        <span class="opnote-field-hint">The standard list (bleeding, infection, wound healing, scarring, pain, numbness, adjacent-structure injury, recurrence, further surgery, anaesthetic risks) is always emitted. Add the groups that apply.</span>
        <div class="opnote-subsection">
          <p class="opnote-subsection-title">Additional risk groups</p>
          {RISK_GROUPS.map((g) => (
            <label class="opnote-toggle" key={g.key}>
              <input type="checkbox" checked={state[g.key] as boolean}
                onChange={(e) => update(g.key, (e.currentTarget as HTMLInputElement).checked as State[typeof g.key])} />
              <span class="opnote-toggle-label">{g.label}</span>
            </label>
          ))}
        </div>
        {text('specificRisks', 'Procedure-specific risks', 'Free text; leave empty to omit.')}
        {text('alternatives', 'Alternatives discussed')}
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.interpreter}
            onChange={(e) => update('interpreter', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Interpreter present</span>
        </label>
        {state.interpreter && text('interpreterLanguage', 'Language')}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Anaesthesia</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Anaesthetic</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Anaesthetic">
            {(['local', 'walant', 'regional', 'ga', 'combined', 'sedation'] as const).map((v) => (
              <label class="opnote-radio" key={v}>
                <input type="radio" name="anaesthesia" value={v} checked={state.anaesthesia === v}
                  onChange={() => update('anaesthesia', v)} />
                <span>{ANAESTHESIA_LABEL[v]}</span>
              </label>
            ))}
          </div>
        </div>
        {localUsed && (
          <div class="opnote-row opnote-row-2" style="margin-top:12px">
            {state.anaesthesia !== 'walant' && text('localAgent', 'Local agent')}
            {text('localVolume', 'Volume (mL)')}
          </div>
        )}
        {blockUsed && text('blockName', 'Block')}
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Anaesthetist line</span>
          <select class="opnote-field-select" value={state.anaesthetistMode}
            onChange={(e) => update('anaesthetistMode', (e.currentTarget as HTMLSelectElement).value as AnaesthetistMode)}>
            <option value="auto">Auto — follows anaesthetic ({present ? 'present' : 'omitted'})</option>
            <option value="present">Present</option>
            <option value="absent">Omitted</option>
          </select>
        </label>
        {present && text('anaesthetist', 'Anaesthetist')}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Position / prep / tourniquet</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Position</span>
            <select class="opnote-field-select" value={state.position}
              onChange={(e) => update('position', (e.currentTarget as HTMLSelectElement).value as Position)}>
              {(Object.keys(POSITION_LABEL) as Exclude<Position, 'custom'>[]).map((v) => (
                <option value={v} key={v}>{POSITION_LABEL[v]}</option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Skin prep</span>
            <select class="opnote-field-select" value={state.prep}
              onChange={(e) => update('prep', (e.currentTarget as HTMLSelectElement).value as Prep)}>
              <option value="chlorhexidine">0.5% chlorhexidine in alcohol</option>
              <option value="betadine">Povidone-iodine 10% aqueous (face / periocular)</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>
        {state.position === 'custom' && text('positionCustom', 'Position (free text)')}
        {state.prep === 'custom' && text('prepCustom', 'Prep agent (free text)')}
        <label class="opnote-toggle" style="margin-top:12px">
          <input type="checkbox" checked={state.tourniquet}
            onChange={(e) => update('tourniquet', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Tourniquet used{state.anaesthesia === 'walant' ? ' (suppressed under WALANT)' : ''}</span>
        </label>
        {usesTourniquet(state) && (
          <div class="opnote-subsection">
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">Site</span>
                <select class="opnote-field-select" value={state.tourniquetSite}
                  onChange={(e) => update('tourniquetSite', (e.currentTarget as HTMLSelectElement).value as TourniquetSite)}>
                  {(['upper arm', 'forearm', 'thigh', 'calf'] as const).map((v) => (
                    <option value={v} key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {text('tourniquetPressure', 'Pressure (mmHg)')}
            </div>
            <div class="opnote-row opnote-row-3">
              {text('tourniquetOn', 'On (HH:MM)')}
              {text('tourniquetOff', 'Off (HH:MM)')}
              {text('tourniquetTime', 'Total (min)')}
            </div>
          </div>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Prophylaxis</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Antibiotic</span>
            <select class="opnote-field-select" value={state.antibiotic}
              onChange={(e) => update('antibiotic', (e.currentTarget as HTMLSelectElement).value as Antibiotic)}>
              <option value="nil">Nil — clean, no implant</option>
              <option value="cefazolin2">Cefazolin 2 g IV</option>
              <option value="cefazolin3">Cefazolin 3 g IV (≥120 kg)</option>
              <option value="clindamycin">Clindamycin 600 mg IV (β-lactam anaphylaxis)</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">VTE</span>
            <select class="opnote-field-select" value={state.vte}
              onChange={(e) => update('vte', (e.currentTarget as HTMLSelectElement).value as Vte)}>
              <option value="daycase">Day case — mechanical only</option>
              <option value="mechanical">Inpatient — mechanical only</option>
              <option value="pharmacological">Mechanical + enoxaparin 40 mg</option>
            </select>
          </label>
        </div>
        {state.antibiotic === 'custom' && text('antibioticCustom', 'Agent and dose')}
        <span class="opnote-field-hint">HQSC NZ guideline: cefazolin 2 g, 3 g at ≥120 kg, within 60 min of incision; with a tourniquet the infusion is completed before inflation (added automatically).</span>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Procedure</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Steps</span>
          <textarea class="opnote-field-textarea" rows={8} value={state.steps}
            onInput={(e) => update('steps', (e.currentTarget as HTMLTextAreaElement).value)} />
          <span class="opnote-field-hint">One step per line — numbered automatically.</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Implants and specimens</p>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.hasImplants}
            onChange={(e) => update('hasImplants', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Implants used (adds the Implants section and the implant-card bullet)</span>
        </label>
        {state.hasImplants && (
          <div class="opnote-subsection">
            {text('implantSystem', 'Implant system')}
            {area('implants', 'Components', 'One component per line with size, REF and LOT.')}
          </div>
        )}
        <label class="opnote-toggle" style="margin-top:12px">
          <input type="checkbox" checked={state.hasSpecimens}
            onChange={(e) => update('hasSpecimens', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Specimens sent (adds the histology-review bullet)</span>
        </label>
        {state.hasSpecimens && area('specimens', 'Specimens', 'One specimen per line.')}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Findings and events</p>
        {area('findings', 'Findings', 'One bullet per line.')}
        <div class="opnote-row opnote-row-2" style="margin-top:12px">
          {text('bloodLoss', 'Estimated blood loss')}
          {text('complications', 'Complications')}
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Post-op plan</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Skin sutures</span>
            <select class="opnote-field-select" value={state.sutures}
              onChange={(e) => update('sutures', (e.currentTarget as HTMLSelectElement).value as Sutures)}>
              <option value="nonabsorbable">Non-absorbable — removal bullet</option>
              <option value="absorbable">Absorbable — wound check instead</option>
              <option value="none">None — glue / adhesive strips</option>
            </select>
          </label>
          {text('sutureDays', 'Removal / wound check (days)')}
        </div>
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Bullets</span>
          <textarea class="opnote-field-textarea" rows={8} value={state.postOp}
            onInput={(e) => update('postOp', (e.currentTarget as HTMLTextAreaElement).value)} />
          <span class="opnote-field-hint">One bullet per line. The line {'{sutures}'} is replaced by the suture bullet chosen above. Histology, implant-card, ACC and clinic-review bullets are appended automatically.</span>
        </label>
        {text('followUpWeeks', 'Clinic review (weeks)')}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Signature date</p>
        {text('signatureDate', 'Date of documentation')}
      </div>
    </OperationNoteShell>
  );
}

export const meta = {
  slug: 'general-operation-note',
  title: 'General operation note',
  indication:
    'Bare RCS Good Surgical Practice section spine for any procedure without a dedicated template — standard consent wording with switchable risk groups, prophylaxis and VTE lines, tourniquet, implant and specimen records, and a generic post-op plan. Every section is editable line by line.',
  category: 'general' as const,
  emits:
    'Header · Diagnosis bullets · Standard + grouped consent risks · Position / anaesthesia / tourniquet line · Antibiotic + VTE line · Numbered steps · Optional implants and specimens · Findings · EBL · Complications · Count · Post-op plan with suture-driven removal bullet · Signature',
  lastReviewed: '2026-09-10',
  version: '1.0',
};

export default GeneralOperationNote;
