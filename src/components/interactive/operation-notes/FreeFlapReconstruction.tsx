// Free flap reconstruction — operation note template.
//
// Source-of-truth: 01-brand-system/operation-notes-package/templates/
//                  free-flap-reconstruction.md
//
// Modular: recipient site prep + flap-type-specific harvest module +
// microsurgical anastomosis + flap inset + donor closure + post-op plan.
//
// Flap-type toggle (ALT / RFFF / fibula / DIEP / LD / gracilis / MSAP /
// SCIP) drives the harvest module narrative and the donor-closure plan.

import { useState, useCallback } from 'preact/hooks';
import OperationNoteShell from './_shared/OperationNoteShell';
import { joinSections, bullets } from './_shared/markdown';

type FlapType =
  | 'alt'
  | 'rfff'
  | 'fibula'
  | 'diep'
  | 'ld'
  | 'gracilis'
  | 'msap'
  | 'scip';

type DefectIndication = 'oncologic resection' | 'trauma' | 'debridement';

interface State {
  date: string;
  theatre: string;
  start: string;
  end: string;
  assistant: string;
  anaesthetist: string;
  hasAnaesthetist: boolean;
  defectSite: string;
  defectIndication: DefectIndication;
  defectLength: string;
  defectWidth: string;
  flapType: FlapType;
  pedicleLength: string;
  arteryCalibre: string;
  veinCalibre: string;
  flapDims: string;
  arteryAnastomosis: 'end-to-end' | 'end-to-side';
  couplerSize: '2.0' | '2.5' | '3.0';
  ischaemiaTime: string;
  ebl: string;
  signatureDate: string;
}

const INITIAL_STATE: State = {
  date: '[DD/MM/YYYY]',
  theatre: '[Theatre]',
  start: '[HH:MM]',
  end: '[HH:MM]',
  assistant: '[Registrar Dr ____ / Fellow Dr ____]',
  anaesthetist: '[Dr ____]',
  hasAnaesthetist: true,
  defectSite: '[SITE]',
  defectIndication: 'oncologic resection',
  defectLength: '[____]',
  defectWidth: '[____]',
  flapType: 'alt',
  pedicleLength: '[___]',
  arteryCalibre: '[___]',
  veinCalibre: '[___]',
  flapDims: '[___] × [___]',
  arteryAnastomosis: 'end-to-end',
  couplerSize: '3.0',
  ischaemiaTime: '[___]',
  ebl: '[___]',
  signatureDate: '[DD/MM/YYYY]',
};

const FLAP_LABEL: Record<FlapType, string> = {
  alt: 'Anterolateral thigh (ALT)',
  rfff: 'Radial forearm (RFFF)',
  fibula: 'Free fibula',
  diep: 'DIEP',
  ld: 'Latissimus dorsi',
  gracilis: 'Gracilis',
  msap: 'MSAP',
  scip: 'SCIP',
};

function harvestBlock(s: State): { title: string; steps: string[]; donorClosure: string } {
  switch (s.flapType) {
    case 'alt':
      return {
        title: '## Flap harvest — ALT (Anterolateral Thigh)',
        steps: [
          `Pre-op Doppler used; perforator(s) marked at the midpoint of a line from ASIS to superolateral patella.`,
          `Patient supine with knee slightly flexed.`,
          `Medial skin incision first; subfascial dissection identifies septocutaneous / musculocutaneous perforator(s) from descending branch of lateral circumflex femoral artery (LCFA) in vastus lateralis / rectus-vastus intermuscular septum.`,
          `Perforator chosen: ${s.arteryCalibre} mm calibre, musculocutaneous; intramuscular dissection performed.`,
          `Pedicle dissected proximally to source on descending branch of LCFA — final pedicle length ${s.pedicleLength} cm; artery ${s.arteryCalibre} mm, paired venae ${s.veinCalibre} mm.`,
          `Lateral skin incision completed; flap raised on perforator(s); harvested as fasciocutaneous — dimensions ${s.flapDims} cm.`,
        ],
        donorClosure:
          'ALT donor closed primarily in layers (deep fascia 2-0 Vicryl; subcutaneous 2-0 Vicryl; skin staples). STSG to donor if width >8–9 cm.',
      };
    case 'rfff':
      return {
        title: '## Flap harvest — Radial forearm free flap',
        steps: [
          `Allen's test pre-op confirmed adequate ulnar collateral (palmar arch reperfusion <6 s).`,
          `Non-dominant arm; upper arm tourniquet 250 mmHg; flap marked over distal radial artery.`,
          `Volar longitudinal incision; subfascial elevation preserving paratenon over FCR and FDS.`,
          `Radial artery and venae comitantes ± cephalic vein identified; perforators preserved within the flap.`,
          `Pedicle ligated distally and dissected proximally to brachial bifurcation as required — pedicle length ${s.pedicleLength} cm; artery ${s.arteryCalibre} mm.`,
          `Flap ${s.flapDims} cm.`,
        ],
        donorClosure:
          'STSG from thigh inset over paratenon; volar splint to wrist for 7 days.',
      };
    case 'fibula':
      return {
        title: '## Flap harvest — Free fibula',
        steps: [
          `Pre-op CTA confirmed three-vessel runoff to foot.`,
          `Lateral approach; lateral compartment muscles split; peroneus longus / brevis retracted; preserve 6 cm proximal (CPN) and 6 cm distal (ankle mortise).`,
          `Osteotomies at proximal and distal limits with oscillating saw; fibula released from interosseous membrane.`,
          `Peroneal pedicle identified posteriorly; tibialis posterior protected; pedicle dissected to TPT trunk — length ${s.pedicleLength} cm; artery ${s.arteryCalibre} mm.`,
          `Skin paddle (if used) raised on septocutaneous perforators in posterior crural septum.`,
        ],
        donorClosure:
          'Donor closed in layers; long-leg posterior splint with foot at 90°.',
      };
    case 'diep':
      return {
        title: '## Flap harvest — DIEP',
        steps: [
          `Pre-op CTA: dominant perforator(s) identified at ___ mm from umbilicus, medial / lateral row.`,
          `Lower abdominal flap marked; skin incised; suprafascial dissection from lateral to medial.`,
          `Selected perforator(s) traced through rectus sheath; intramuscular dissection preserving motor nerves.`,
          `DIEA and venae comitantes traced to external iliac origin — pedicle length ${s.pedicleLength} cm.`,
          `Flap ${s.flapDims} cm raised; weighed [___] g.`,
        ],
        donorClosure:
          'Rectus sheath closed with 0-PDS interrupted (± mesh inlay if sheath defect >2 cm); Scarpa\'s fascia 2-0 Vicryl; skin staples; umbilicus reinset; quilting sutures; two 15F suction drains.',
      };
    case 'ld':
      return {
        title: '## Flap harvest — Latissimus dorsi free flap',
        steps: [
          `Lateral decubitus / prone position.`,
          `Skin paddle marked over muscle if myocutaneous; longitudinal axillary incision.`,
          `Muscle elevated off chest wall; thoracodorsal pedicle identified at the angular branch; serratus and circumflex scapular branches ligated as required.`,
          `Thoracodorsal nerve preserved if reinnervation planned; otherwise divided.`,
          `Pedicle dissected to subscapular trunk — length ${s.pedicleLength} cm.`,
          `Flap raised; donor area sized ${s.flapDims} cm.`,
        ],
        donorClosure:
          'Donor closed in layers over two 15F drains; quilting sutures to reduce seroma.',
      };
    case 'gracilis':
      return {
        title: '## Flap harvest — Gracilis',
        steps: [
          `Supine; thigh abducted, knee flexed.`,
          `Incision 2 cm posterior to line of adductor longus, in proximal third of medial thigh.`,
          `Gracilis identified between adductor longus (anterior) and semimembranosus (posterior).`,
          `Pedicle (medial circumflex femoral artery branch) identified entering proximal third; preserved.`,
          `Distal tendon divided; muscle harvested. Flap dimensions ${s.flapDims} cm.`,
          `Pedicle length ${s.pedicleLength} cm; artery ${s.arteryCalibre} mm.`,
        ],
        donorClosure: 'Donor closed in layers.',
      };
    case 'msap':
      return {
        title: '## Flap harvest — MSAP (Medial Sural Artery Perforator)',
        steps: [
          `Prone or lateral position; Doppler-marked perforators 8–18 cm distal to popliteal crease over medial gastrocnemius.`,
          `Medial incision; intramuscular dissection of perforator to medial sural artery.`,
          `Pedicle length ${s.pedicleLength} cm; flap ${s.flapDims} cm.`,
        ],
        donorClosure:
          'Donor closed primarily if width ≤5 cm; STSG if wider.',
      };
    case 'scip':
      return {
        title: '## Flap harvest — SCIP (Superficial Circumflex Iliac Artery Perforator)',
        steps: [
          `Supine; flap centred on a line from femoral artery to ASIS.`,
          `Suprafascial dissection identifies superficial branch of SCIA and SIEV.`,
          `Short pedicle (4–6 cm); thin pliable flap ${s.flapDims} cm.`,
        ],
        donorClosure: 'Donor closed primarily.',
      };
  }
}

function renderMarkdown(s: State): string {
  const harvest = harvestBlock(s);
  return joinSections(
    `# OPERATION NOTE — Free flap reconstruction`,
    [
      `Date: ${s.date}    Theatre: ${s.theatre}    Elective`,
      `Start: ${s.start}    End: ${s.end}`,
      `Primary surgeon: Mateusz Gładysz, Consultant Plastic and Hand Surgeon`,
      `Assistant: ${s.assistant}`,
      s.hasAnaesthetist
        ? `Anaesthetist: ${s.anaesthetist}    Anaesthetic: GA`
        : `Anaesthetic: GA`,
      `WHO Surgical Safety Checklist: Sign-in / Time-out / Sign-out — completed.`,
    ].join('\n'),
    `## Diagnosis / Indication`,
    bullets([
      `Soft-tissue defect of ${s.defectSite} following ${s.defectIndication}.`,
      `Plan: Free ${FLAP_LABEL[s.flapType]} flap reconstruction.`,
    ]),
    `## Consent`,
    `Risks: bleeding, haematoma, infection, flap failure (total / partial), need for re-exploration, anastomosis revision, donor-site morbidity (scar, contour deformity, sensory change, ${s.flapType === 'alt' ? 'lateral femoral cutaneous nerve neuropraxia' : s.flapType === 'rfff' ? 'cold intolerance and dominant-hand sensory change' : s.flapType === 'fibula' ? 'ankle stiffness and CPN neuropraxia' : 'donor-site weakness and seroma'}), DVT / PE, prolonged immobility, scar, ongoing rehabilitation. Discussed with patient.`,
    `## Antibiotics / VTE prophylaxis`,
    `Cefazolin 2 g IV at induction; continued 24 h post-op. Mechanical VTE prophylaxis intra-op; pharmacological enoxaparin once haemostasis satisfactory.`,
    `## Recipient site preparation`,
    bullets([
      `Defect ${s.defectLength} cm × ${s.defectWidth} cm at ${s.defectSite}; tissues missing: skin / subcutis / muscle / bone / dura / mucosa as documented.`,
      `Debridement to healthy bleeding edges; tumour clearance margins per frozen section (if oncologic).`,
      `Recipient vessels identified: artery [facial / superficial temporal / radial / anterior tibial / posterior tibial / DIEA / thoracodorsal / internal mammary] — calibre [___] mm; vein [paired venae comitantes / external jugular / cephalic] — calibre [___] mm.`,
      `Heparinised saline (10 IU/mL) irrigation; vessels assessed for spasm and flow; clip applied proximally for later anastomosis.`,
      `Pedicle route planned and tunnel created where required.`,
    ]),
    harvest.title,
    bullets(harvest.steps),
    `## Microsurgical anastomosis`,
    bullets([
      `Operating microscope (×10–25). Heparinised saline irrigation.`,
      `Recipient artery prepared; adventitia trimmed; lumen inspected.`,
      `Arterial: ${s.arteryAnastomosis} to [vessel] using 9-0 nylon interrupted simple sutures (8–10 sutures depending on calibre).`,
      `Venous: end-to-end with ${s.couplerSize} mm Synovis GEM Coupler (lot/serial sticker attached).`,
      `Release of clamps in sequence venous → arterial; flap re-perfused; capillary refill, colour, turgor, bleeding from edges and Doppler signal confirmed.`,
      `Anastomosis times: arterial ischaemia → reperfusion ${s.ischaemiaTime} min; total ischaemia [___] min.`,
      `Patency confirmed by strip-empty-refill test and audible Doppler signal post-perfusion.`,
    ]),
    `## Flap inset`,
    bullets([
      `Flap orientated to defect; trimmed to size.`,
      `Inset in layers: deep dermal 3-0 Vicryl; skin 4-0 nylon / staples.`,
      `Implanted Cook–Swartz Doppler (20 MHz) probe placed on venous limb; lead exit marked.`,
      `External skin paddle exposed for clinical observation.`,
      `Two suction drains placed away from pedicle.`,
    ]),
    `## Donor closure`,
    bullets([harvest.donorClosure]),
    `## Findings`,
    bullets([
      `Single dominant ${s.flapType === 'diep' ? 'perforator' : s.flapType === 'fibula' ? 'peroneal pedicle' : s.flapType === 'gracilis' || s.flapType === 'ld' ? 'pedicle' : 'musculocutaneous perforator'} identified; pedicle length adequate; flap perfused well at completion.`,
    ]),
    `## Estimated blood loss`,
    `${s.ebl} mL.`,
    `## Complications`,
    `Nil intra-operative.`,
    `## Count`,
    `Swabs / needles / instruments — confirmed correct.`,
    `## Post-op plan`,
    bullets([
      `HDU / dedicated flap-monitoring ward.`,
      `Flap observations: colour, capillary refill, turgor, temperature, Doppler signal — every 30 min × 4 h, then 1 h × 24 h, 2 h × 24 h, 4 h thereafter for 5 days.`,
      `Head of bed 30°; affected limb elevated; warm room (≥24 °C); avoid pressure on pedicle.`,
      `IVF 1.5–2 mL/kg/h aiming UO ≥0.5 mL/kg/h; Hb ≥80 g/L; avoid vasoconstrictors where possible.`,
      `Aspirin 100 mg daily from day 1 × 4 weeks (per local protocol); VTE prophylaxis with enoxaparin once haemostasis satisfactory.`,
      `Antibiotics: cefazolin 8 g/day for 24 h then stop unless contamination.`,
      `Early hand therapy / physiotherapy referral as relevant.`,
      `Photography on POD 1, 3, 5.`,
      `Concerning flap signs (pale, mottled, congested, loss of Doppler) → urgent surgeon review; theatre re-exploration within 2 h.`,
    ]),
    `## Signature`,
    `Mateusz Gładysz, Consultant Plastic and Hand Surgeon — ${s.signatureDate}`,
  );
}

function FreeFlapReconstruction() {
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
      downloadName="free-flap-reconstruction"
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
        <p class="opnote-section-title">Defect</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Defect site</span>
          <input class="opnote-field-input" type="text" value={state.defectSite}
            onInput={(e) => update('defectSite', (e.currentTarget as HTMLInputElement).value)} />
        </label>
        <div class="opnote-field">
          <span class="opnote-field-label">Indication</span>
          <select class="opnote-field-select" value={state.defectIndication}
            onChange={(e) => update('defectIndication', (e.currentTarget as HTMLSelectElement).value as DefectIndication)}>
            <option value="oncologic resection">Oncologic resection</option>
            <option value="trauma">Trauma</option>
            <option value="debridement">Debridement</option>
          </select>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Defect length (cm)</span>
            <input class="opnote-field-input" type="text" value={state.defectLength}
              onInput={(e) => update('defectLength', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Defect width (cm)</span>
            <input class="opnote-field-input" type="text" value={state.defectWidth}
              onInput={(e) => update('defectWidth', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Flap</p>
        <label class="opnote-field">
          <span class="opnote-field-label">Flap type</span>
          <select class="opnote-field-select" value={state.flapType}
            onChange={(e) => update('flapType', (e.currentTarget as HTMLSelectElement).value as FlapType)}>
            {(['alt', 'rfff', 'fibula', 'diep', 'ld', 'gracilis', 'msap', 'scip'] as const).map((v) => (
              <option value={v}>{FLAP_LABEL[v]}</option>
            ))}
          </select>
        </label>
        <div class="opnote-row opnote-row-3">
          <label class="opnote-field">
            <span class="opnote-field-label">Pedicle length (cm)</span>
            <input class="opnote-field-input" type="text" value={state.pedicleLength}
              onInput={(e) => update('pedicleLength', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Artery calibre (mm)</span>
            <input class="opnote-field-input" type="text" value={state.arteryCalibre}
              onInput={(e) => update('arteryCalibre', (e.currentTarget as HTMLInputElement).value)} />
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Vein calibre (mm)</span>
            <input class="opnote-field-input" type="text" value={state.veinCalibre}
              onInput={(e) => update('veinCalibre', (e.currentTarget as HTMLInputElement).value)} />
          </label>
        </div>
        <label class="opnote-field">
          <span class="opnote-field-label">Flap dimensions (cm)</span>
          <input class="opnote-field-input" type="text" value={state.flapDims}
            onInput={(e) => update('flapDims', (e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>

      <div class="opnote-section">
        <p class="opnote-section-title">Anastomosis</p>
        <div class="opnote-field">
          <span class="opnote-field-label">Arterial anastomosis</span>
          <div class="opnote-radio-group opnote-radio-group-cols-2" role="radiogroup" aria-label="Arterial anastomosis">
            <label class="opnote-radio">
              <input type="radio" name="anastomosis" value="end-to-end" checked={state.arteryAnastomosis === 'end-to-end'}
                onChange={() => update('arteryAnastomosis', 'end-to-end')} />
              <span>End-to-end</span>
            </label>
            <label class="opnote-radio">
              <input type="radio" name="anastomosis" value="end-to-side" checked={state.arteryAnastomosis === 'end-to-side'}
                onChange={() => update('arteryAnastomosis', 'end-to-side')} />
              <span>End-to-side</span>
            </label>
          </div>
        </div>
        <div class="opnote-row opnote-row-2">
          <label class="opnote-field">
            <span class="opnote-field-label">Coupler size (mm)</span>
            <select class="opnote-field-select" value={state.couplerSize}
              onChange={(e) => update('couplerSize', (e.currentTarget as HTMLSelectElement).value as State['couplerSize'])}>
              <option value="2.0">2.0</option>
              <option value="2.5">2.5</option>
              <option value="3.0">3.0</option>
            </select>
          </label>
          <label class="opnote-field">
            <span class="opnote-field-label">Arterial ischaemia (min)</span>
            <input class="opnote-field-input" type="text" value={state.ischaemiaTime}
              onInput={(e) => update('ischaemiaTime', (e.currentTarget as HTMLInputElement).value)} />
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
  slug: 'free-flap-reconstruction',
  title: 'Free flap reconstruction',
  indication:
    'Microvascular tissue transfer. Modular: recipient prep + flap-type-specific harvest + anastomosis + inset + post-op flap-monitoring plan. Flap library: ALT / RFFF / fibula / DIEP / LD / gracilis / MSAP / SCIP.',
  category: 'free-flap' as const,
  emits:
    'Defect · Recipient vessels · Harvest module · Coupler + 9-0 anastomosis · Cook–Swartz Doppler · HDU monitoring schedule',
  lastReviewed: '2026-05-19',
  version: '1.0',
};

export default FreeFlapReconstruction;
