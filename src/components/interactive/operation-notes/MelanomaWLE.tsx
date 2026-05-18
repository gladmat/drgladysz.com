// Melanoma wide local excision + SLNB — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  melanoma-wide-local-excision-slnb.md
//
// Margin matrix per Australian and New Zealand Melanoma Guidelines
// (Sladden et al., MJA 2018) / SCNZ 4th Edition. Form lets the surgeon
// override the guideline value with a documented rationale.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets, numbered } from './_shared/markdown';

type Stage = 'in-situ' | 'pT1' | 'pT2' | 'pT3' | 'pT4';

type Basin = 'axilla' | 'groin' | 'cervical' | 'parotid' | 'interval node';

interface State {
  date: string;
  theatre: string;
  start: string;
  end: string;
  assistant: string;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  site: string;
  breslowMm: string;
  ulcerated: boolean;
  mitoticRate: string;
  clarkLevel: string;
  margins: string;
  stage: Stage;
  margin: string;
  marginRationale: string;
  basin: Basin;
  hotNodesOnSpect: string;
  ebl: string;
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
  site: '[SITE]',
  breslowMm: '[___]',
  ulcerated: false,
  mitoticRate: '[___]',
  clarkLevel: '[___]',
  margins: '[___]',
  stage: 'pT1',
  margin: '10',
  marginRationale: 'per guideline',
  basin: 'axilla',
  hotNodesOnSpect: '[___]',
  ebl: '[___]',
  signatureDate: '[DD/MM/YYYY]',
};

const STAGE_LABEL: Record<Stage, string> = {
  'in-situ': 'Melanoma in situ',
  pT1: 'pT1 (≤1.0 mm)',
  pT2: 'pT2 (1.01–2.0 mm)',
  pT3: 'pT3 (2.01–4.0 mm)',
  pT4: 'pT4 (>4.0 mm)',
};

const STAGE_DISPLAY: Record<Stage, string> = {
  'in-situ': 'in situ',
  pT1: '1',
  pT2: '2',
  pT3: '3',
  pT4: '4',
};

const STAGE_GUIDELINE_MARGIN: Record<Stage, string> = {
  'in-situ': '5–10 mm',
  pT1: '10 mm',
  pT2: '10–20 mm',
  pT3: '10–20 mm',
  pT4: '20 mm',
};

function renderMarkdown(s: State): string {
  return joinSections(
    `# OPERATION NOTE — Melanoma wide local excision + SLNB`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    Elective`,
      `Start: ${s.start}    End: ${s.end}`,
      `Surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: GA`
        : `Anaesthetic: GA`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
    ].join('\n'),
    `## Diagnosis / Indication`,
    bullets([
      `Biopsy-proven cutaneous melanoma of ${s.site}.`,
      `Histology: Breslow ${s.breslowMm} mm, ${s.ulcerated ? 'ulcerated' : 'non-ulcerated'}, mitotic rate ${s.mitoticRate}/mm², Clark level ${s.clarkLevel}, margins ${s.margins}.`,
      `Stage (AJCC 8): pT${STAGE_DISPLAY[s.stage]}; clinically N0, M0.`,
      `Plan: Wide local excision with ${s.margin} mm clinical margin (per Australian and New Zealand Melanoma Guidelines, Sladden et al., MJA 2018 / SCNZ 4th Edition); sentinel lymph node biopsy (SLNB) as Breslow ≥0.8 mm with high-risk features.`,
    ]),
    `### Configurable WLE margin (Breslow-based)`,
    bullets([
      `Melanoma in situ: 5–10 mm`,
      `pT1 (≤1.0 mm): 10 mm`,
      `pT2 (1.01–2.0 mm): 10–20 mm`,
      `pT3 (2.01–4.0 mm): 10–20 mm`,
      `pT4 (>4.0 mm): 20 mm`,
    ]),
    `Margin selected for this patient: ${s.margin} mm. Rationale: ${s.marginRationale}.`,
    `## Consent`,
    `Risks: bleeding, haematoma, infection, scar, recurrence, incomplete excision, lymphoedema (regional), seroma, sensory loss, anaphylaxis to patent blue, transient blue staining of skin and urine, false-negative SLNB, need for completion lymphadenectomy if SLN positive (current practice is observation per MSLT-II / DeCOG-SLT — discussed).`,
    `## Preoperative`,
    bullets([
      `Lymphoscintigraphy performed [date, time]: Tc-99m antimony sulphide colloid injected intradermally peri-lesionally; SLN basin identified: ${s.basin}. Number of hot nodes on SPECT-CT: ${s.hotNodesOnSpect}. Skin marked.`,
    ]),
    `## Position / Prep / Drape`,
    `Supine; [arm abducted / leg externally rotated / head turned] for ${s.basin} access. Prep 0.5% chlorhexidine-alcohol. Wide drape.`,
    `## Anaesthesia / Antibiotics`,
    `GA. Cefazolin 2 g IV at induction. Tourniquet not used (interferes with dye dynamics).`,
    `## Procedure — SLNB first, then WLE`,
    numbered([
      `Blue dye: 1.0 mL of patent blue V injected intradermally around the biopsy scar; gentle massage.`,
      `Gamma probe used to localise transcutaneous hot spot; skin incision marked in skin crease over peak count.`,
      `Incision through skin and subcutis; blunt dissection along blue lymphatics.`,
      `Hot/blue sentinel node identified, mobilised, vascular pedicle clipped, node excised.`,
      `Ex vivo counts: SLN1 [___] counts; background bed [___] counts. SLN considered "hot" if ≥10% of hottest node or ≥10× background.`,
      `Field rechecked for residual hot nodes; additional SLNs harvested until residual basin count <10% of hottest node.`,
      `Nodes labelled SLN1, SLN2, … sent for serial sectioning + S100 / SOX10 / HMB45 immunohistochemistry.`,
      `Wound irrigated, haemostasis; closure deep dermal 3-0 Monocryl, subcuticular 4-0 Monocryl.`,
      `WLE: margin marked at ${s.margin} mm radial clinical clearance from the scar / visible pigment, extended down to deep fascia (not including fascia unless tumour-involved). Elliptical excision along long axis of limb / RSTL. Orientation sutures: short = superior, long = lateral. Closure: direct primary (undermining wide).`,
    ]),
    `## Findings`,
    bullets([
      `SLN basin: [___] nodes harvested.`,
      `WLE bed: no macroscopic residual tumour.`,
    ]),
    `## Specimens`,
    bullets([
      `"SLN1 — ${s.basin} — short = lateral"; "SLN2 …"; "WLE ${s.site} — short = superior, long = lateral".`,
    ]),
    `## Estimated blood loss`,
    `${s.ebl} mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      `Mobilise as comfort. Elevate limb (if relevant).`,
      `Analgesia: regular paracetamol + ibuprofen ± oxycodone PRN.`,
      `Drain (if present) out when <30 mL/24 h.`,
      `Warn re. transient blue urine and skin 24–48 h.`,
      `Histology MDM referral.`,
      `Clinic follow-up at 2 weeks for review and discussion of nodal histology; subsequent surveillance per SCNZ 4th Edition.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function MelanomaWLE() {
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
      downloadName="melanoma-wide-local-excision-slnb"
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
        <p class="opnote-section-title">Lesion + histology</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Site</span>
          <input class="opnote-field-input" type="text" value={state.site}
            onInput={(e) => update('site', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Breslow (mm)</span>
            <input class="opnote-field-input" type="text" value={state.breslowMm}
              onInput={(e) => update('breslowMm', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Mitotic rate (/mm²)</span>
            <input class="opnote-field-input" type="text" value={state.mitoticRate}
              onInput={(e) => update('mitoticRate', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Clark level</span>
            <input class="opnote-field-input" type="text" value={state.clarkLevel}
              onInput={(e) => update('clarkLevel', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Biopsy margins</span>
            <input class="opnote-field-input" type="text" value={state.margins}
              onInput={(e) => update('margins', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <label class="opnote-toggle">
          <input type="checkbox" checked={state.ulcerated}
            onChange={(e) => update('ulcerated', (e.currentTarget as HTMLInputElement).checked)} />
          <span class="opnote-toggle-label">Ulcerated</span>
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Stage + WLE margin</p>
        <label class="opnote-field">
          <span class="opnote-field-label">AJCC 8 pT</span>
          <select class="opnote-field-select" value={state.stage}
            onChange={(e) => update('stage', (e.currentTarget as HTMLSelectElement).value as Stage)}>
            {(['in-situ', 'pT1', 'pT2', 'pT3', 'pT4'] as const).map((v) => (
              <option value={v}>{STAGE_LABEL[v]}</option>
            ))}
          </select>
          <p class="opnote-field-hint">
            Guideline margin for {STAGE_LABEL[state.stage]}: {STAGE_GUIDELINE_MARGIN[state.stage]}.
          </p>
        </label>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Margin selected (mm)</span>
            <input class="opnote-field-input" type="text" value={state.margin}
              onInput={(e) => update('margin', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Rationale</span>
            <input class="opnote-field-input" type="text" value={state.marginRationale}
              onInput={(e) => update('marginRationale', (e.currentTarget as HTMLInputElement).value)} />
            <p class="opnote-field-hint">e.g. "per guideline", "anatomic constraint", "per MDM".</p>
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">SLNB</p>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Basin</span>
            <select class="opnote-field-select" value={state.basin}
              onChange={(e) => update('basin', (e.currentTarget as HTMLSelectElement).value as Basin)}>
              <option value="axilla">Axilla</option>
              <option value="groin">Groin</option>
              <option value="cervical">Cervical</option>
              <option value="parotid">Parotid</option>
              <option value="interval node">Interval node</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Hot nodes on SPECT-CT</span>
            <input class="opnote-field-input" type="text" value={state.hotNodesOnSpect}
              onInput={(e) => update('hotNodesOnSpect', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Perioperative</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Estimated blood loss (mL)</span>
          <input class="opnote-field-input" type="text" value={state.ebl}
            onInput={(e) => update('ebl', (e.currentTarget as HTMLInputElement).value)} />
        </label>
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
  slug: 'melanoma-wide-local-excision-slnb',
  title: 'Melanoma wide local excision + SLNB',
  indication:
    'Wide local excision of biopsy-proven cutaneous melanoma with sentinel lymph node biopsy. Margin matrix per ANZ Melanoma Guidelines (Sladden 2018) / SCNZ 4th Edition.',
  category: 'skin-soft-tissue' as const,
  emits:
    'Histology · AJCC 8 pT · Configurable margin matrix · Lymphoscintigraphy · Patent blue + gamma probe · WLE · Surveillance plan',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default MelanomaWLE;
