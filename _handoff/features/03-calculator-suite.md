---
feature: calculator-suite
tier: 2
ships_with: months-1-12
effort_hours_per_calculator: 4-8
priority_order: [QuickDASH, PRWE, Boston-CTS, MHQ, Mayo-Wrist]
status: locked
version: 1.7
---

# Feature 3 — Calculator suite

Native (not embedded) clinical calculators for the most-used hand and plastic surgery scoring systems. Each calculator is a Preact island component with form inputs, scoring logic from the published validation paper, and result display following MDCalc's six-tab structure.

---

## Strategic value

MDCalc gets ~65% of US attendings and ~79% of US residents using it regularly (2017 Mass General Brigham survey). Building native calculators rather than embedding MDCalc captures SEO equity for high-intent clinician queries — clinicians worldwide search by calculator name. Each calculator is:

- A **permanent traffic anchor** — clinicians search by name, the calculator ranks
- A **daily-use tool** — converts the site from quarterly-read essay collection to weekly-utility resource
- A **cross-link target** from every clinical article that mentions the relevant condition
- A **substantial signal of clinical authority** — the kind of practical resource that earns peer trust

---

## Priority order (locked)

Build in this sequence — each is a separate ~4-8 hour build session:

1. **QuickDASH** (Disabilities of the Arm, Shoulder, and Hand — abbreviated)
2. **PRWE** (Patient-Rated Wrist Evaluation)
3. **Boston CTS Symptom Severity Scale** (Carpal Tunnel Syndrome)
4. **MHQ** (Michigan Hand Outcomes Questionnaire — selected scales)
5. **Mayo Wrist Score**

Three additional candidates open for later:
- Levine-Katz Carpal Tunnel Symptom Severity (alternative to Boston)
- Eaton-Littler classification (CMC1 staging)
- DASH (full version, not just QuickDASH)

---

## MDCalc's six-tab structure (locked for every calculator)

Each calculator page has exactly six content sections:

1. **The Calculator** (interactive component)
2. **When to Use** — clinical scenarios where the score is informative
3. **Pearls and Pitfalls** — interpretation caveats
4. **Why Use** — what clinical decision the score supports
5. **Next Steps** — what to do based on the result
6. **Evidence** — citations to the validation paper(s) and key follow-up literature
7. (Optional) **Creator Insights** — historical note on who developed the score and why

This structure is locked. Don't reinvent the layout per calculator; consistency IS the authority signal.

---

## Calculator component pattern — generic structure

Each calculator is a Preact island at `src/components/interactive/[Name].tsx`:

```typescript
// src/components/interactive/QuickDASH.tsx
import { useState } from 'preact/hooks';

interface QuickDASHResponses {
  [questionId: string]: number; // 1-5 Likert
}

const QUESTIONS = [
  { id: 'q1', text: 'Open a tight or new jar' },
  { id: 'q2', text: 'Do heavy household chores (e.g., wash walls, floors)' },
  { id: 'q3', text: 'Carry a shopping bag or briefcase' },
  { id: 'q4', text: 'Wash your back' },
  { id: 'q5', text: 'Use a knife to cut food' },
  { id: 'q6', text: 'Recreational activities requiring force or impact' },
  { id: 'q7', text: 'Sleep affected by pain in arm, shoulder, or hand' },
  { id: 'q8', text: 'Limited in work or daily activities by arm/shoulder/hand problem' },
  { id: 'q9', text: 'Pain in your arm, shoulder, or hand' },
  { id: 'q10', text: 'Tingling/needles in your arm, shoulder, or hand' },
  { id: 'q11', text: 'Difficulty performing usual social activities' },
];

const RESPONSE_LABELS = [
  { value: 1, text: 'No difficulty / Mild' },
  { value: 2, text: 'Mild difficulty / Moderate' },
  { value: 3, text: 'Moderate difficulty / Severe' },
  { value: 4, text: 'Severe difficulty / Very severe' },
  { value: 5, text: 'Unable / Extreme' },
];

export default function QuickDASH() {
  const [responses, setResponses] = useState<QuickDASHResponses>({});
  
  const completedCount = Object.keys(responses).length;
  const isComplete = completedCount >= QUESTIONS.length - 1; // Allow 1 missing (per published rules)
  
  const score = calculateQuickDASH(responses);
  
  return (
    <div class="calculator">
      <fieldset class="calculator-form">
        <legend>Rate your ability to do the following activities in the last week</legend>
        
        {QUESTIONS.map((q, i) => (
          <div class="question-row" key={q.id}>
            <label class="question-label">
              <span class="question-number">{i + 1}.</span>
              {q.text}
            </label>
            <div class="response-group" role="radiogroup" aria-label={q.text}>
              {RESPONSE_LABELS.map((r) => (
                <label class="response-option">
                  <input
                    type="radio"
                    name={q.id}
                    value={r.value}
                    checked={responses[q.id] === r.value}
                    onChange={() => setResponses({ ...responses, [q.id]: r.value })}
                  />
                  <span class="response-text">
                    <span class="response-value">{r.value}</span>
                    {r.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      
      <div class="result-panel" aria-live="polite">
        {!isComplete && (
          <p class="result-incomplete">
            Answer at least {QUESTIONS.length - 1} of {QUESTIONS.length} questions to see score
            <span class="completion-progress">
              ({completedCount}/{QUESTIONS.length} answered)
            </span>
          </p>
        )}
        
        {isComplete && (
          <div class="result-display">
            <p class="result-label">QuickDASH Score</p>
            <p class="result-value">{score.toFixed(1)}</p>
            <p class="result-interpretation">{interpretQuickDASH(score)}</p>
            <p class="result-range">Range: 0 (no disability) to 100 (most severe disability)</p>
          </div>
        )}
        
        {Object.keys(responses).length > 0 && (
          <button 
            type="button" 
            onClick={() => setResponses({})}
            class="reset-button"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function calculateQuickDASH(responses: QuickDASHResponses): number {
  // Per Beaton et al. 2005 (J Hand Ther 18:33-44):
  // Score = ((sum of responses / number of completed responses) - 1) × 25
  // Allow up to 1 missing response (max 1)
  
  const values = Object.values(responses);
  if (values.length < QUESTIONS.length - 1) return 0;
  
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  return (mean - 1) * 25;
}

function interpretQuickDASH(score: number): string {
  // Common interpretation thresholds (multiple references; cite in Evidence section)
  if (score < 15) return 'Minimal disability';
  if (score < 40) return 'Mild to moderate disability';
  if (score < 70) return 'Moderate to severe disability';
  return 'Severe disability';
}
```

```css
/* Calculator-specific styles (uses brand tokens) */
.calculator {
  font-family: var(--sans);
  background: var(--bg-card);
  border: 1px solid var(--rule-strong);
  padding: 32px;
  margin: 32px 0;
}

.calculator-form {
  border: none;
  padding: 0;
  margin: 0;
}

.calculator legend {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 24px;
  padding: 0;
}

.question-row {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--rule);
}

.question-row:last-child {
  border-bottom: none;
}

.question-label {
  display: block;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink);
  margin-bottom: 12px;
}

.question-number {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--accent);
  margin-right: 8px;
}

.response-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.response-option {
  flex: 1;
  min-width: 120px;
  cursor: pointer;
}

.response-option input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.response-text {
  display: block;
  padding: 10px 12px;
  border: 1px solid var(--rule-strong);
  background: var(--bg);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  transition: all 0.15s;
}

.response-option:hover .response-text {
  border-color: var(--ink-2);
}

.response-option input:checked + .response-text {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--bg);
}

.response-value {
  display: block;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 4px;
  opacity: 0.7;
}

.result-panel {
  margin-top: 32px;
  padding: 24px;
  background: var(--bg-deep);
  border-left: 3px solid var(--accent);
}

.result-incomplete {
  font-size: 14px;
  color: var(--ink-2);
  margin: 0;
}

.completion-progress {
  font-family: var(--mono);
  font-size: 12px;
  margin-left: 12px;
  color: var(--ink-3);
}

.result-display {
  text-align: center;
}

.result-label {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
  margin: 0 0 8px;
}

.result-value {
  font-family: var(--serif);
  font-size: 64px;
  font-weight: 400;
  line-height: 1;
  color: var(--ink);
  margin: 0 0 12px;
}

.result-interpretation {
  font-family: var(--serif);
  font-size: 18px;
  font-style: italic;
  color: var(--ink);
  margin: 0 0 8px;
}

.result-range {
  font-size: 13px;
  color: var(--ink-3);
  margin: 0;
}

.reset-button {
  display: inline-block;
  margin-top: 16px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--ink-3);
  font-family: var(--sans);
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
}

.reset-button:hover {
  border-color: var(--ink);
  color: var(--ink);
}
```

---

## Calculator page template

```astro
---
// src/pages/en/calculators/[slug].astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import QuickDASH from '@/components/interactive/QuickDASH.tsx';
import PRWE from '@/components/interactive/PRWE.tsx';
import BostonCTS from '@/components/interactive/BostonCTS.tsx';
import { getCalculatorBySlug } from '@/lib/sanity';

const { slug } = Astro.params;
const calculator = await getCalculatorBySlug(slug);

const calculatorComponents = {
  'quickdash': QuickDASH,
  'prwe': PRWE,
  'boston-cts': BostonCTS,
};

const Component = calculatorComponents[slug];
---

<BaseLayout
  title={`${calculator.name} Calculator — ${calculator.fullName}`}
  description={calculator.shortDescription}
  jsonLd={generateMedicalCalculatorSchema(calculator)}
>
  <article class="calculator-page">
    <header class="calculator-header">
      <p class="category">Calculator</p>
      <h1>{calculator.name}</h1>
      <p class="subtitle">{calculator.fullName}</p>
    </header>
    
    <!-- Tab 1: The Calculator -->
    <section aria-labelledby="calc-heading">
      <h2 id="calc-heading">Calculator</h2>
      <Component client:visible />
    </section>
    
    <!-- Tab 2: When to Use -->
    <section aria-labelledby="when-heading">
      <h2 id="when-heading">When to use</h2>
      <PortableText value={calculator.whenToUse} />
    </section>
    
    <!-- Tab 3: Pearls & Pitfalls -->
    <section aria-labelledby="pearls-heading">
      <h2 id="pearls-heading">Pearls and pitfalls</h2>
      <PortableText value={calculator.pearlsPitfalls} />
    </section>
    
    <!-- Tab 4: Why Use -->
    <section aria-labelledby="why-heading">
      <h2 id="why-heading">Why use</h2>
      <PortableText value={calculator.whyUse} />
    </section>
    
    <!-- Tab 5: Next Steps -->
    <section aria-labelledby="next-heading">
      <h2 id="next-heading">Next steps based on score</h2>
      <PortableText value={calculator.nextSteps} />
    </section>
    
    <!-- Tab 6: Evidence -->
    <section aria-labelledby="evidence-heading" class="evidence-section">
      <h2 id="evidence-heading">Evidence</h2>
      <PortableText value={calculator.evidence} />
    </section>
    
    {calculator.creatorInsights?.length > 0 && (
      <section aria-labelledby="creator-heading">
        <h2 id="creator-heading">Creator insights</h2>
        <PortableText value={calculator.creatorInsights} />
      </section>
    )}
    
    <Bibliography references={references} />
  </article>
</BaseLayout>
```

---

## Sanity schema — `calculator.ts`

```typescript
// studio/schemas/calculator.ts
import { defineType, defineField } from 'sanity';

export const calculator = defineType({
  name: 'calculator',
  title: 'Calculator',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Short name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'fullName', title: 'Full name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name' }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'shortDescription', title: 'Short description', type: 'text', rows: 2, validation: (Rule) => Rule.max(160) }),
    defineField({ name: 'componentName', title: 'Component name (e.g., QuickDASH)', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'whenToUse', title: 'When to use', type: 'array', of: [{ type: 'block' }], validation: (Rule) => Rule.required() }),
    defineField({ name: 'pearlsPitfalls', title: 'Pearls and pitfalls', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'whyUse', title: 'Why use', type: 'array', of: [{ type: 'block' }], validation: (Rule) => Rule.required() }),
    defineField({ name: 'nextSteps', title: 'Next steps based on score', type: 'array', of: [{ type: 'block' }] }),
    defineField({ name: 'evidence', title: 'Evidence', type: 'array', of: [{ type: 'block' }], validation: (Rule) => Rule.required() }),
    defineField({ name: 'creatorInsights', title: 'Creator insights (optional)', type: 'array', of: [{ type: 'block' }] }),
  ],
});
```

---

## Critical: Clinical correctness verification

Each calculator's scoring formula must be implemented exactly per the published validation paper. Before publishing any calculator:

1. **Read the original validation paper carefully.** Do not rely on summary sources.
2. **Implement the formula in code.**
3. **Test against the published example calculations.** Most validation papers include 2-3 worked examples; verify the calculator produces the same scores.
4. **Cross-check against MDCalc** for sanity.
5. **Have a second clinician** (ideally another FEBHS surgeon) verify the implementation.

This is ~30 minutes per calculator. Do not skip it. A miscalculated score on a clinician-facing tool is worse than no calculator.

---

## Calculator scoring references (priority five)

| Calculator | Validation paper | Notes |
|---|---|---|
| QuickDASH | Beaton et al. 2005 (J Hand Ther 18:33-44) | Score = ((sum/n) - 1) × 25; allow 1 missing of 11 |
| PRWE | MacDermid et al. 2000 (J Hand Ther 9:178-83) | Pain (5 items) + Function (10 items); equal weighting |
| Boston CTS Symptom Severity | Levine et al. 1993 (J Bone Joint Surg 75A:1585-92) | 11 items, mean of completed items, 1-5 Likert |
| MHQ | Chung et al. 1998 (J Hand Surg Am 23:575-87) | 6 domains; selected scales for site (Function, ADL, Pain) |
| Mayo Wrist Score | Cooney et al. 1987 (Clin Orthop 220:122-28) | Pain (25) + Function (25) + ROM (25) + Grip (25) = 100 |

---

## Effort per calculator

- **Read validation paper, implement formula:** 1-2 hours
- **Build Preact component with form + scoring:** 2-3 hours
- **Style the component using brand tokens:** 1 hour
- **Author the 6-tab content (when to use, pearls, etc.) in Sanity:** 2-3 hours (Mateusz)
- **Clinical verification against published examples:** 30 min
- **Test, deploy, cross-link from articles:** 30 min

**Per calculator: 4-8 hours of dev + 2-3 hours of clinical content authoring**

**Priority five total: ~25-40 hours of dev + ~10-15 hours of clinical content**

---

## Why native, not embedded

MDCalc offers an embed API. Don't use it. Reasons:

1. **No SEO equity** — Google credits MDCalc, not your site
2. **Branding drift** — embeds carry MDCalc styling, breaks brand cohesion
3. **No control** — embeds can change/break unpredictably
4. **Performance hit** — embeds load third-party scripts
5. **Loss of differentiation** — your site looks like every other site that embeds MDCalc

Native calculators take more time but the equity stays with drgladysz.com.
