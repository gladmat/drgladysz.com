// Open carpal tunnel release — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  open-carpal-tunnel-release.md
//
// Elective decompression. The technique encoded here is the operator's own
// (mirrors the /en/procedures/open-carpal-tunnel-release/ page): incision in
// line with the ring-finger radial border, ulnar to the thenar crease and
// proximal to Kaplan's line; ligament entered at its ulnar third; planes
// developed above and below before division; scissors proximally, scalpel
// distally; no routine neurolysis / epineurotomy / tenosynovectomy; 3-0
// Pronova mattress; bulky non-circumferential dressing; no splint.
//
// Site-driven resolution (v2.1 pattern): the anaesthetist line, the
// local-anaesthetic mix and its volume default from the anaesthetic choice
// at render time — no stored derived state. Local + tourniquet defaults to
// the Waikato skin-shop mix (0.4% lignocaine, 1:250,000 adrenaline, within
// 1–1.5 mL/kg); WALANT defaults to the buffered Lalonde mix (1% lignocaine,
// 1:100,000 adrenaline, 8.4% sodium bicarbonate 10:1). Skin closure drives
// the post-op removal bullet (absorbable closure has nothing to remove).

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered, todayNZ } from './_shared/markdown';

type Anaesthesia = 'local' | 'walant' | 'regional' | 'ga';
type AnaesthetistMode = 'auto' | 'present' | 'absent';
type Side = 'unspecified' | 'left' | 'right';
type NcsSeverity = 'unspecified' | 'mild' | 'moderate' | 'severe';
type Injections = 'none' | 'one' | 'two';
type InjectionRelief = 'transient' | 'none';
type NerveAppearance = 'compressed' | 'hourglass' | 'normal';
type Closure = 'pronova' | 'monocryl';
type LaMix = 'auto' | 'skinshop' | 'buffered' | 'custom';

interface State {
  date: string;
  assistant: string;
  hasAssistant: boolean;
  anaesthetist: string;
  anaesthetistMode: AnaesthetistMode;
  anaesthesia: Anaesthesia;
  laMix: LaMix;
  localAgent: string; // used only when laMix === 'custom'
  localVolume: string; // '' = auto (20 mL for the two standard mixes, 10 mL custom)
  tourniquetPressure: string;
  tourniquetOn: string;
  tourniquetOff: string;
  tourniquetTime: string;
  side: Side;
  thenarWasting: boolean;
  sensoryLoss: boolean;
  ncsDone: boolean;
  ncsDate: string;
  ncsSeverity: NcsSeverity;
  splintMonths: string;
  injections: Injections;
  injectionRelief: InjectionRelief;
  antibioticsGiven: boolean;
  acc: boolean;
  accNumber: string;
  nerveAppearance: NerveAppearance;
  bifidNerve: boolean;
  persistentMedianArtery: boolean;
  transligamentousBranch: boolean;
  synovitis: boolean;
  tenosynovectomy: boolean;
  additionalFindings: string;
  closure: Closure;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  assistant: '[Registrar Dr ____]',
  hasAssistant: true,
  anaesthetist: '[Dr ____]',
  anaesthetistMode: 'auto',
  anaesthesia: 'local',
  laMix: 'auto',
  localAgent: '1% lignocaine with 1:100,000 adrenaline',
  localVolume: '',
  tourniquetPressure: '250',
  tourniquetOn: '[HH:MM]',
  tourniquetOff: '[HH:MM]',
  tourniquetTime: '[MM]',
  side: 'unspecified',
  thenarWasting: false,
  sensoryLoss: false,
  ncsDone: true,
  ncsDate: '[DATE]',
  ncsSeverity: 'unspecified',
  splintMonths: '[___]',
  injections: 'none',
  injectionRelief: 'transient',
  antibioticsGiven: false,
  acc: false,
  accNumber: '[#########]',
  nerveAppearance: 'compressed',
  bifidNerve: false,
  persistentMedianArtery: false,
  transligamentousBranch: false,
  synovitis: false,
  tenosynovectomy: false,
  additionalFindings: '',
  closure: 'pronova',
  signatureDate: '[DD/MM/YYYY]',
};

const ANAESTHESIA_LABEL: Record<Anaesthesia, string> = {
  local: 'Local infiltration + tourniquet',
  walant: 'WALANT',
  regional: 'Supraclavicular block',
  ga: 'GA',
};

const SIDE_LABEL: Record<Side, string> = {
  unspecified: '[SIDE]',
  left: 'Left',
  right: 'Right',
};

const NCS_SEVERITY_LABEL: Record<NcsSeverity, string> = {
  unspecified: '[___]',
  mild: 'mild',
  moderate: 'moderate',
  severe: 'severe',
};

const NERVE_APPEARANCE_PHRASE: Record<NerveAppearance, string> = {
  compressed:
    'median nerve compressed and flattened beneath it, hyperaemic proximally',
  hourglass:
    'median nerve with an hourglass constriction beneath its distal edge, hyperaemic proximally',
  normal: 'median nerve of normal calibre and colour',
};

const CLOSURE_STEP: Record<Closure, string> = {
  pronova: 'Skin closed with 3-0 Pronova interrupted mattress sutures.',
  monocryl:
    'Skin closed with 4-0 Monocryl subcuticular running; Steri-Strips applied.',
};

const CLOSURE_POSTOP: Record<Closure, string> = {
  pronova: 'Sutures out at 10–14 days.',
  monocryl:
    'Absorbable subcuticular closure — no sutures to remove; wound check at 10–14 days.',
};

// Tourniquet is a property of the anaesthetic choice, not a separate toggle:
// WALANT is defined by its absence.
function usesTourniquet(a: Anaesthesia): boolean {
  return a !== 'walant';
}

function anaesthetistPresent(s: State): boolean {
  if (s.anaesthetistMode !== 'auto') return s.anaesthetistMode === 'present';
  return s.anaesthesia === 'regional' || s.anaesthesia === 'ga';
}

type ResolvedLaMix = Exclude<LaMix, 'auto'>;

function resolveLaMix(s: State): ResolvedLaMix {
  if (s.laMix !== 'auto') return s.laMix;
  return s.anaesthesia === 'walant' ? 'buffered' : 'skinshop';
}

const LA_MIX_LABEL: Record<ResolvedLaMix, string> = {
  skinshop: 'Skin-shop mix — 0.4% lignocaine, 1:250,000 adrenaline',
  buffered: 'Buffered WALANT mix — 1% lignocaine, 1:100,000 adrenaline, 8.4% sodium bicarbonate 10:1',
  custom: 'Custom',
};

// Noun phrase for the infiltration sentence. The skin-shop mix carries its
// weight-based ceiling so the note documents the dose check; the buffered
// mix states the ratio so the preparation is reproducible.
function laAgentPhrase(s: State, mix: ResolvedLaMix): string {
  switch (mix) {
    case 'skinshop':
      return '0.4% lignocaine with 1:250,000 adrenaline';
    case 'buffered':
      return '1% lignocaine with 1:100,000 adrenaline buffered 10:1 with 8.4% sodium bicarbonate';
    case 'custom':
      return s.localAgent;
  }
}

function resolveLocalVolume(s: State, mix: ResolvedLaMix): string {
  const typed = s.localVolume.trim();
  if (typed) return typed;
  return mix === 'custom' ? '10' : '20';
}

function laDosePhrase(s: State, mix: ResolvedLaMix): string {
  const volume = `${resolveLocalVolume(s, mix)} mL`;
  return mix === 'skinshop' ? `${volume} (within 1–1.5 mL/kg)` : volume;
}

// "A, B, or C" / "A or B" / "A" — for the negative-findings sentence.
function orList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;
}

function andList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function diagnosisLines(s: State): string[] {
  const exam = `Thenar wasting ${s.thenarWasting ? 'present' : 'absent'}; sensory loss ${s.sensoryLoss ? 'present' : 'absent'}.`;
  const ncs = s.ncsDone
    ? `NCS ${s.ncsDate}: ${NCS_SEVERITY_LABEL[s.ncsSeverity]} median neuropathy at the wrist.`
    : `NCS not performed — clinical diagnosis (CTS-6 [___]/26).`;
  const injection =
    s.injections === 'none'
      ? 'no steroid injection'
      : `steroid injection ×${s.injections === 'one' ? '1' : '2'} with ${s.injectionRelief === 'transient' ? 'transient' : 'no'} relief`;
  return [
    `${SIDE_LABEL[s.side]} carpal tunnel syndrome — nocturnal paraesthesia in the median distribution; Phalen / Tinel / Durkan positive. ${exam}`,
    ncs,
    `Conservative management failed: night splinting ${s.splintMonths} months; ${injection}.`,
  ];
}

function positionLine(s: State): string {
  const base = 'Supine, arm on hand table, forearm supinated.';
  const tourniquet = `Upper arm tourniquet ${s.tourniquetPressure} mmHg, on ${s.tourniquetOn} off ${s.tourniquetOff} = ${s.tourniquetTime} min.`;
  const mix = resolveLaMix(s);
  const agent = laAgentPhrase(s, mix);
  const dose = laDosePhrase(s, mix);
  switch (s.anaesthesia) {
    case 'local':
      return `${base} Incision marked before infiltration. Local infiltration of ${agent}, ${dose}, along the planned incision and into the carpal tunnel. ${tourniquet}`;
    case 'walant':
      return `${base} Incision marked before infiltration. WALANT: ${agent}, ${dose}, infiltrated subcutaneously proximal to the wrist crease over the median nerve and along the incision into the carpal tunnel; allowed 25 min for vasoconstriction. No tourniquet.`;
    case 'regional':
      return `${base} Supraclavicular block. ${tourniquet}`;
    case 'ga':
      return `${base} GA. ${tourniquet}`;
  }
}

function procedureSteps(s: State): string[] {
  const inspection = s.tenosynovectomy
    ? `Carpal tunnel inspected; median nerve confirmed free along its length. Flexor tenosynovectomy performed for florid tenosynovitis; synovium sent for histology. No internal neurolysis or epineurotomy performed.`
    : `Carpal tunnel inspected; median nerve confirmed free along its length. No internal neurolysis, epineurotomy, or tenosynovectomy performed.`;
  const haemostasis = usesTourniquet(s.anaesthesia)
    ? `Tourniquet down; haemostasis with bipolar diathermy; saline irrigation.`
    : `Haemostasis with bipolar diathermy; saline irrigation.`;
  return [
    `Longitudinal incision 2–3 cm in line with the radial border of the ring finger, from 1–2 mm distal to the distal wrist crease, ulnar to the thenar crease and proximal to Kaplan's cardinal line.`,
    `Skin and subcutaneous fat incised with a No. 15 blade; self-retaining retractor placed; palmar fascia divided longitudinally, exposing the transverse carpal ligament.`,
    `Transverse carpal ligament entered at its ulnar third under direct vision; median nerve identified proximally and protected.`,
    `Planes developed superficial and deep to the ligament with Metzenbaum scissors; proximal limit at the distal antebrachial fascia and distal limit at the volar fat pad visualised before division.`,
    `Ligament divided completely from proximal to distal under direct vision — Metzenbaum scissors proximally, releasing the distal antebrachial fascia at the wrist crease; No. 15 blade distally through the volar fat pad to the distal edge of the ligament.`,
    inspection,
    haemostasis,
    CLOSURE_STEP[s.closure],
    `Non-adherent dressing and soft, bulky, non-circumferential wool and crepe; no splint.`,
  ];
}

function findingsLines(s: State): string[] {
  const variants: string[] = [];
  if (s.bifidNerve) variants.push('bifid median nerve');
  if (s.persistentMedianArtery) variants.push('persistent median artery');
  if (s.transligamentousBranch)
    variants.push('transligamentous recurrent motor branch');

  const negatives: string[] = [];
  if (variants.length === 0)
    negatives.push(
      'anatomical variant (bifid nerve, persistent median artery, transligamentous motor branch)',
    );
  if (!s.synovitis) negatives.push('flexor tenosynovitis');
  negatives.push('space-occupying lesion');

  const lines = [
    `Transverse carpal ligament thickened; ${NERVE_APPEARANCE_PHRASE[s.nerveAppearance]}.`,
  ];
  if (variants.length > 0)
    lines.push(
      `Anatomical variant identified and preserved: ${andList(variants)}.`,
    );
  if (s.synovitis)
    lines.push(
      s.tenosynovectomy
        ? `Florid flexor tenosynovitis — synovectomy performed, specimen to histology.`
        : `Mild flexor tenosynovitis — not excised.`,
    );
  lines.push(`No ${orList(negatives)}.`);
  const extra = s.additionalFindings.trim();
  if (extra) lines.push(extra);
  return lines;
}

function postOpLines(s: State): string[] {
  return [
    `Elevation when comfortable; immediate active finger and thumb range of motion; light pain-free use of the hand from day 1. No splint.`,
    `Analgesia: paracetamol + NSAID regularly for 48–72 h.`,
    `Bulky dressing reduced to a light dry dressing at 48–72 h (GP or Plastics dressings clinic); keep dry until wound review.`,
    CLOSURE_POSTOP[s.closure],
    `Hand therapy referral: single early consultation — range of motion, oedema and scar management, return-to-work guidance.`,
    `Scar massage from 2 weeks once healed. Driving when able to grip the wheel comfortably, typically 1–2 weeks. Desk work 2–3 weeks; manual work 4–6 weeks.`,
    `Pillar pain and gradual grip recovery expected for 3–6 months; persistent numbness may take longer where pre-operative axonal loss was severe.`,
    s.acc && `ACC claim lodged.`,
    s.tenosynovectomy && `Histology to be reviewed at clinic.`,
    `Clinic review at 6 weeks.`,
  ].filter((l): l is string => Boolean(l));
}

function renderMarkdown(s: State): string {
  const anaesthetic = ANAESTHESIA_LABEL[s.anaesthesia];
  return joinSections(
    `# OPERATION NOTE — Open carpal tunnel release`,
    [
      `Date: ${s.date}    Elective`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      s.hasAssistant && `Assistant: ${s.assistant}`,
      anaesthetistPresent(s)
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: ${anaesthetic}`
        : `Anaesthetic: ${anaesthetic}`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
      s.acc && `ACC45 #: ${s.accNumber} — gradual process claim (occupational).`,
    ]
      .filter(Boolean)
      .join('\n'),
    `## Diagnosis / Indication`,
    bullets(diagnosisLines(s)),
    `## Consent`,
    `Risks discussed: bleeding, infection, scar tenderness and pillar pain, incomplete relief or recurrence, persistent numbness or weakness where pre-operative nerve damage is severe, injury to the median nerve or its palmar cutaneous / recurrent motor branches, stiffness, CRPS, need for further surgery. Alternatives (continued splinting, steroid injection) discussed. Written consent obtained.`,
    `## Position / Anaesthesia / Tourniquet`,
    positionLine(s),
    `## Antibiotics`,
    s.antibioticsGiven
      ? `Cefazolin 2 g IV at induction (1 g if <80 kg).`
      : `Nil — clean elective procedure without implant; prophylaxis not indicated.`,
    `## Procedure — Open carpal tunnel release`,
    numbered(procedureSteps(s)),
    s.tenosynovectomy && `## Specimens`,
    s.tenosynovectomy && `Flexor tenosynovium — histology.`,
    `## Findings`,
    bullets(findingsLines(s)),
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

function OpenCarpalTunnelRelease() {
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
  const tourniquet = usesTourniquet(state.anaesthesia);
  const localUsed = state.anaesthesia === 'local' || state.anaesthesia === 'walant';
  const resolvedMix = resolveLaMix(state);

  return (
    <OperationNoteShell
      renderMarkdown={() => renderMarkdown(state)}
      onReset={reset}
      downloadName="open-carpal-tunnel-release"
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
          <input type="checkbox" checked={state.acc}
            onChange={(e) => update('acc', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">ACC gradual process claim (occupational)</span>
        </label>
        {state.acc && (
          <label class="opnote-field">
            <span class="opnote-field-label">ACC45 number</span>
            <input class="opnote-field-input" type="text" value={state.accNumber}
              onInput={(e) => update('accNumber', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Diagnosis</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Side</span>
            <select class="opnote-field-select" value={state.side}
              onChange={(e) => update('side', (e.currentTarget as HTMLSelectElement).value as Side)}>
              <option value="unspecified">[SIDE]</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Night splinting (months)</span>
            <input class="opnote-field-input" type="text" value={state.splintMonths}
              onInput={(e) => update('splintMonths', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.thenarWasting}
            onChange={(e) => update('thenarWasting', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Thenar wasting present</span>
        </label>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.sensoryLoss}
            onChange={(e) => update('sensoryLoss', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Sensory loss present</span>
        </label>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.ncsDone}
            onChange={(e) => update('ncsDone', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Nerve conduction studies performed</span>
        </label>
        {state.ncsDone && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">NCS</p>
            <div class="opnote-row opnote-row-2">
              <label class="opnote-field">
                <span class="opnote-field-label">NCS date</span>
                <input class="opnote-field-input" type="text" value={state.ncsDate}
                  onInput={(e) => update('ncsDate', (e.currentTarget as HTMLInputElement).value)} />
              </label>
              <label class="opnote-field">
                <span class="opnote-field-label">Severity</span>
                <select class="opnote-field-select" value={state.ncsSeverity}
                  onChange={(e) => update('ncsSeverity', (e.currentTarget as HTMLSelectElement).value as NcsSeverity)}>
                  <option value="unspecified">[___]</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </label>
            </div>
          </div>
        )}
        <div class="opnote-row opnote-row-2" style="margin-top:12px">
          <label class="opnote-field">
            <span class="opnote-field-label">Steroid injections</span>
            <select class="opnote-field-select" value={state.injections}
              onChange={(e) => update('injections', (e.currentTarget as HTMLSelectElement).value as Injections)}>
              <option value="none">None</option>
              <option value="one">×1</option>
              <option value="two">×2</option>
            </select>
          </label>
          {state.injections !== 'none' && (
            <label class="opnote-field">
              <span class="opnote-field-label">Response to injection</span>
              <select class="opnote-field-select" value={state.injectionRelief}
                onChange={(e) => update('injectionRelief', (e.currentTarget as HTMLSelectElement).value as InjectionRelief)}>
                <option value="transient">Transient relief</option>
                <option value="none">No relief</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Anaesthesia</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Anaesthetic</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Anaesthetic">
            {(['local', 'walant', 'regional', 'ga'] as const).map((v) => (
              <label class="opnote-radio" key={v}>
                <input type="radio" name="anaesthesia" value={v} checked={state.anaesthesia === v}
                  onChange={() => update('anaesthesia', v)} />
                <span>{ANAESTHESIA_LABEL[v]}</span>
              </label>
            ))}
          </div>
        </div>
        {localUsed && (
          <div class="opnote-subsection">
            <p class="opnote-subsection-title">Local anaesthetic</p>
            <label class="opnote-field">
              <span class="opnote-field-label">Mix</span>
              <select class="opnote-field-select" value={state.laMix}
                onChange={(e) => update('laMix', (e.currentTarget as HTMLSelectElement).value as LaMix)}>
                <option value="auto">Auto — follows anaesthetic ({resolvedMix === 'skinshop' ? 'skin-shop mix' : 'buffered WALANT mix'})</option>
                <option value="skinshop">{LA_MIX_LABEL.skinshop}</option>
                <option value="buffered">{LA_MIX_LABEL.buffered}</option>
                <option value="custom">Custom</option>
              </select>
              <span class="opnote-field-hint">Skin-shop mix with tourniquet, buffered mix for WALANT. Bicarbonate is drawn up fresh: 1 mL of 8.4% per 10 mL of lignocaine-adrenaline.</span>
            </label>
            <div class="opnote-row opnote-row-2" style="margin-top:12px">
              {resolvedMix === 'custom' && (
                <label class="opnote-field">
                  <span class="opnote-field-label">Agent</span>
                  <input class="opnote-field-input" type="text" value={state.localAgent}
                    onInput={(e) => update('localAgent', (e.currentTarget as HTMLInputElement).value)} />
                </label>
              )}
              <label class="opnote-field">
                <span class="opnote-field-label">Volume (mL)</span>
                <input class="opnote-field-input" type="text" value={state.localVolume}
                  placeholder={`Auto — ${resolveLocalVolume(state, resolvedMix)} mL`}
                  onInput={(e) => update('localVolume', (e.currentTarget as HTMLInputElement).value)} />
                <span class="opnote-field-hint">Leave blank for 20 mL with either standard mix (10 mL custom).</span>
              </label>
            </div>
          </div>
        )}
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Anaesthetist line</span>
          <select class="opnote-field-select" value={state.anaesthetistMode}
            onChange={(e) => update('anaesthetistMode', (e.currentTarget as HTMLSelectElement).value as AnaesthetistMode)}>
            <option value="auto">Auto — follows anaesthetic ({present ? 'present' : 'omitted'})</option>
            <option value="present">Present</option>
            <option value="absent">Omitted</option>
          </select>
        </label>
        {present && (
          <label class="opnote-field">
            <span class="opnote-field-label">Anaesthetist</span>
            <input class="opnote-field-input" type="text" value={state.anaesthetist}
              onInput={(e) => update('anaesthetist', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.antibioticsGiven}
            onChange={(e) => update('antibioticsGiven', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Prophylactic antibiotic given (Cefazolin 2 g IV)</span>
        </label>
      </div>

      {tourniquet && (
        <div class="opnote-section">
          <p class="opnote-section-title">Tourniquet</p>
          <div class="opnote-row opnote-row-2">
            <label class="opnote-field">
              <span class="opnote-field-label">Pressure (mmHg)</span>
              <input class="opnote-field-input" type="text" value={state.tourniquetPressure}
                onInput={(e) => update('tourniquetPressure', (e.currentTarget as HTMLInputElement).value)} />
            </label>
            <label class="opnote-field">
              <span class="opnote-field-label">Total (min)</span>
              <input class="opnote-field-input" type="text" value={state.tourniquetTime}
                onInput={(e) => update('tourniquetTime', (e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
          <div class="opnote-row opnote-row-2">
            <label class="opnote-field">
              <span class="opnote-field-label">On (HH:MM)</span>
              <input class="opnote-field-input" type="text" value={state.tourniquetOn}
                onInput={(e) => update('tourniquetOn', (e.currentTarget as HTMLInputElement).value)} />
            </label>
            <label class="opnote-field">
              <span class="opnote-field-label">Off (HH:MM)</span>
              <input class="opnote-field-input" type="text" value={state.tourniquetOff}
                onInput={(e) => update('tourniquetOff', (e.currentTarget as HTMLInputElement).value)} />
            </label>
          </div>
        </div>
      )}

      <div class="opnote-section">
        <p class="opnote-section-title">Findings</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Median nerve appearance</span>
          <select class="opnote-field-select" value={state.nerveAppearance}
            onChange={(e) => update('nerveAppearance', (e.currentTarget as HTMLSelectElement).value as NerveAppearance)}>
            <option value="compressed">Compressed and flattened, hyperaemic proximally</option>
            <option value="hourglass">Hourglass constriction, hyperaemic proximally</option>
            <option value="normal">Normal calibre and colour</option>
          </select>
        </label>
        <div class="opnote-subsection">
          <p class="opnote-subsection-title">Anatomical variants identified</p>
          <label class="opnote-toggle">
            <input type="checkbox" checked={state.bifidNerve}
              onChange={(e) => update('bifidNerve', (e.currentTarget as HTMLInputElement).checked)} />
            <span class="opnote-toggle-label">Bifid median nerve</span>
          </label>
          <label class="opnote-toggle">
            <input type="checkbox" checked={state.persistentMedianArtery}
              onChange={(e) => update('persistentMedianArtery', (e.currentTarget as HTMLInputElement).checked)} />
            <span class="opnote-toggle-label">Persistent median artery</span>
          </label>
          <label class="opnote-toggle">
            <input type="checkbox" checked={state.transligamentousBranch}
              onChange={(e) => update('transligamentousBranch', (e.currentTarget as HTMLInputElement).checked)} />
            <span class="opnote-toggle-label">Transligamentous recurrent motor branch</span>
          </label>
        </div>
        <label class="opnote-toggle" style="margin-top:12px">
          <input type="checkbox" checked={state.synovitis}
            onChange={(e) => {
              const checked = (e.currentTarget as HTMLInputElement).checked;
              update('synovitis', checked);
              if (!checked) update('tenosynovectomy', false);
            }} />
          <span class="opnote-toggle-label">Flexor tenosynovitis present</span>
        </label>
        {state.synovitis && (
          <label class="opnote-toggle">
            <input type="checkbox" checked={state.tenosynovectomy}
              onChange={(e) => update('tenosynovectomy', (e.currentTarget as HTMLInputElement).checked)} />
            <span class="opnote-toggle-label">Tenosynovectomy performed (specimen to histology)</span>
          </label>
        )}
        <label class="opnote-field" style="margin-top:12px">
          <span class="opnote-field-label">Additional findings (optional)</span>
          <textarea class="opnote-field-textarea" value={state.additionalFindings}
            onInput={(e) => update('additionalFindings', (e.currentTarget as HTMLTextAreaElement).value)} />
          <span class="opnote-field-hint">Emitted as a further bullet under Findings when non-empty.</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Closure</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Skin closure</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Skin closure">
            <label class="opnote-radio">
              <input type="radio" name="closure" value="pronova" checked={state.closure === 'pronova'}
                onChange={() => update('closure', 'pronova')} />
              <span>3-0 Pronova mattress</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="closure" value="monocryl" checked={state.closure === 'monocryl'}
                onChange={() => update('closure', 'monocryl')} />
              <span>4-0 Monocryl subcuticular</span>
            </label>
          </div>
          <span class="opnote-field-hint">Absorbable closure removes the suture-removal bullet from the post-op plan.</span>
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
  slug: 'open-carpal-tunnel-release',
  title: 'Open carpal tunnel release',
  indication:
    'Elective open division of the transverse carpal ligament for carpal tunnel syndrome. Anaesthetic toggle: local + tourniquet / WALANT / supraclavicular block / GA with selectable local mix; closure toggle drives the post-op plan.',
  category: 'hand-surgery' as const,
  emits:
    'Diagnosis with NCS + conservative history · Consent · Anaesthetic-specific position line · Six-step ligament division · Variant-aware findings · Closure-specific post-op plan',
  lastReviewed: '2026-09-08',
  version: '1.1',
};

export default OpenCarpalTunnelRelease;
