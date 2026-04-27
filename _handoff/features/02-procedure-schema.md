---
feature: procedure-schema
tier: 1
ships_with: first-procedure-page
effort_hours: 8-12
maintenance: low-after-iteration
status: locked
version: 1.7
---

# Feature 2 — AO Surgery Reference procedure schema

A Sanity `procedurePage` document type with required fields enforcing the AO Surgery Reference content structure. Every procedure page on the site has the same authoritative architecture regardless of how rushed any individual writing session was.

---

## Why this feature is decisive

Schema discipline beats interactivity for surgeon trust. The AO Surgery Reference is the de facto standard for orthopaedic procedure documentation; encoding the same structural rigor for plastic and hand surgery procedures gives every page on the site the same architectural credibility.

The Sanity schema enforces required fields. A surgeon authoring a new procedure page **cannot publish without filling Indications, Anatomy, Approach, Key Steps, Aftercare, Complications, and Evidence**. The structure does the authority work; the prose can vary.

This is the single most-skipped Tier 1 item by surgeon-built sites — and it produces the most visible quality difference once implemented.

---

## The locked content schema

The structure mirrors AO Surgery Reference's procedure pages:

1. **Indications** — when this procedure is appropriate
2. **Contraindications** — when it should not be performed
3. **Anatomy** — relevant anatomical considerations (with optional illustration)
4. **Patient positioning** — operative setup
5. **Approach** — surgical access
6. **Key Steps (numbered, each with photo + caption + pitfall callout)** — the substantive body of the procedure
7. **Closure** — wound closure approach
8. **Aftercare** — post-operative protocol
9. **Complications** — known risks and how to avoid them
10. **Evidence** — citations to supporting literature (uses Feature 1)

---

## Sanity schema — `procedurePage.ts`

```typescript
// studio/schemas/procedurePage.ts
import { defineType, defineField } from 'sanity';

export const procedurePage = defineType({
  name: 'procedurePage',
  title: 'Procedure page',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'clinical', title: 'Clinical content' },
    { name: 'visual', title: 'Visuals' },
    { name: 'evidence', title: 'Evidence' },
  ],
  fields: [
    // === META ===
    defineField({
      name: 'title',
      title: 'Procedure title',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
      description: 'e.g., "Carpal Tunnel Release (Open)"',
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'meta',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Hand surgery', value: 'hand-surgery' },
          { title: 'Reconstructive & microsurgery', value: 'reconstructive-microsurgery' },
          { title: 'Skin cancer surgery', value: 'skin-cancer' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'audience',
      title: 'Primary audience',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Patient (lay reader)', value: 'patient' },
          { title: 'Peer (clinician)', value: 'peer' },
          { title: 'Mixed', value: 'mixed' },
        ],
      },
      validation: (Rule) => Rule.required(),
      description: 'Drives default voice register; mixed pages use glossary tooltips heavily',
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last clinically reviewed',
      type: 'date',
      group: 'meta',
      validation: (Rule) => Rule.required(),
      description: 'Display this date prominently. Update at least annually.',
    }),
    
    // === CLINICAL CONTENT (all required) ===
    defineField({
      name: 'indications',
      title: '1. Indications',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required().min(1),
      description: 'When this procedure is clinically indicated',
    }),
    defineField({
      name: 'contraindications',
      title: '2. Contraindications',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      description: 'Absolute and relative contraindications',
    }),
    defineField({
      name: 'anatomy',
      title: '3. Relevant anatomy',
      type: 'array',
      group: 'clinical',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            { name: 'alt', title: 'Alt text (accessibility)', type: 'string', validation: (Rule) => Rule.required() },
          ],
        },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'positioning',
      title: '4. Patient positioning',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      description: 'Operative setup, table position, regional anatomy considerations',
    }),
    defineField({
      name: 'approach',
      title: '5. Approach',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
      description: 'Surgical access — incision, dissection, exposure',
    }),
    
    // === KEY STEPS (the substantive body) ===
    defineField({
      name: 'keySteps',
      title: '6. Key steps (numbered, ordered)',
      type: 'array',
      group: 'clinical',
      of: [
        {
          type: 'object',
          name: 'procedureStep',
          fields: [
            {
              name: 'title',
              title: 'Step title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'description',
              title: 'Description',
              type: 'array',
              of: [{ type: 'block' }],
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'image',
              title: 'Step image (optional)',
              type: 'image',
              options: { hotspot: true },
              fields: [
                { name: 'caption', title: 'Caption', type: 'string' },
                { name: 'alt', title: 'Alt text', type: 'string', validation: (Rule) => Rule.required() },
              ],
            },
            {
              name: 'pitfall',
              title: 'Pitfall callout (optional)',
              type: 'text',
              rows: 3,
              description: 'Common error or technical pitfall to avoid at this step',
            },
          ],
          preview: {
            select: { title: 'title' },
            prepare: ({ title }) => ({ title: title || 'Untitled step' }),
          },
        },
      ],
      validation: (Rule) => Rule.required().min(2),
      description: 'Ordered list of key surgical steps. Minimum 2 steps required.',
    }),
    
    // === CLOSURE / AFTERCARE / COMPLICATIONS ===
    defineField({
      name: 'closure',
      title: '7. Closure',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      description: 'Wound closure technique, dressings, immobilisation',
    }),
    defineField({
      name: 'aftercare',
      title: '8. Aftercare',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
      description: 'Post-operative protocol, rehabilitation, follow-up timeline',
    }),
    defineField({
      name: 'complications',
      title: '9. Complications and how to avoid them',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
      description: 'Known complications, their incidence, and prevention strategies',
    }),
    
    // === EVIDENCE ===
    defineField({
      name: 'evidence',
      title: '10. Evidence and references',
      type: 'array',
      group: 'evidence',
      of: [
        { type: 'block' },
        // Citation marks within the Portable Text are handled via the
        // standard citation annotation defined in article schema
      ],
      validation: (Rule) => Rule.required(),
      description: 'Body text that integrates citations using the standard citation mark. Citations cite reference documents.',
    }),
    
    // === KEY POINTS BOX (JAMA-style summary) ===
    defineField({
      name: 'keyPoints',
      title: 'Key Points box (top-of-article summary)',
      type: 'object',
      group: 'meta',
      fields: [
        {
          name: 'question',
          title: 'Question',
          type: 'string',
          description: 'What clinical question does this procedure answer?',
        },
        {
          name: 'findings',
          title: 'Findings (or Indications)',
          type: 'string',
          description: 'When is this procedure indicated and what does it achieve?',
        },
        {
          name: 'meaning',
          title: 'Meaning (or Clinical relevance)',
          type: 'text',
          rows: 3,
          description: '2-3 sentence summary of clinical relevance',
        },
      ],
      description: 'JAMA-style 75-100 word summary, displayed at top of procedure page',
    }),
    
    // === SEO META ===
    defineField({
      name: 'seoTitle',
      title: 'SEO title (≤60 chars)',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO meta description (≤160 chars)',
      type: 'text',
      rows: 2,
      group: 'meta',
      validation: (Rule) => Rule.max(160),
    }),
    
    // === PATIENT-FACING SUMMARY (optional) ===
    defineField({
      name: 'patientSummary',
      title: 'Patient-facing summary (optional)',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      description: 'Plain-language version of the procedure for patient audiences. Will appear in collapsible "For patients" section if populated.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      lastUpdated: 'lastUpdated',
    },
    prepare({ title, category, lastUpdated }) {
      return {
        title,
        subtitle: `${category} · Updated ${lastUpdated}`,
      };
    },
  },
});
```

---

## Astro template — `procedure detail page`

```astro
---
// src/pages/en/procedures/[slug].astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import KeyPoints from '@/components/content/KeyPoints.astro';
import Bibliography from '@/components/content/Bibliography.astro';
import { PortableText } from 'astro-portabletext';
import { getProcedureBySlug, getReferencesInOrder } from '@/lib/sanity';
import { generateProcedureSchema } from '@/lib/schema';

const { slug } = Astro.params;
const procedure = await getProcedureBySlug(slug);
const references = await getReferencesInOrder(procedure._id);

if (!procedure) {
  return Astro.redirect('/en/procedures');
}

const jsonLd = generateProcedureSchema(procedure);
---

<BaseLayout
  title={procedure.seoTitle || procedure.title}
  description={procedure.seoDescription}
  jsonLd={jsonLd}
>
  <article class="procedure-page">
    <header class="procedure-header">
      <p class="procedure-category">
        <a href={`/en/procedures/${procedure.category}`}>
          {procedure.category.replace(/-/g, ' ')}
        </a>
      </p>
      <h1>{procedure.title}</h1>
      <p class="last-updated">
        Last clinically reviewed: <time datetime={procedure.lastUpdated}>
          {new Date(procedure.lastUpdated).toLocaleDateString('en-NZ', {
            year: 'numeric', month: 'long', day: 'numeric'
          })}
        </time>
      </p>
    </header>
    
    {procedure.keyPoints && (
      <KeyPoints
        question={procedure.keyPoints.question}
        findings={procedure.keyPoints.findings}
        meaning={procedure.keyPoints.meaning}
      />
    )}
    
    <section aria-labelledby="indications-heading">
      <h2 id="indications-heading">1. Indications</h2>
      <PortableText value={procedure.indications} />
    </section>
    
    {procedure.contraindications?.length > 0 && (
      <section aria-labelledby="contraindications-heading">
        <h2 id="contraindications-heading">2. Contraindications</h2>
        <PortableText value={procedure.contraindications} />
      </section>
    )}
    
    <section aria-labelledby="anatomy-heading">
      <h2 id="anatomy-heading">3. Relevant anatomy</h2>
      <PortableText value={procedure.anatomy} />
    </section>
    
    {procedure.positioning?.length > 0 && (
      <section aria-labelledby="positioning-heading">
        <h2 id="positioning-heading">4. Patient positioning</h2>
        <PortableText value={procedure.positioning} />
      </section>
    )}
    
    <section aria-labelledby="approach-heading">
      <h2 id="approach-heading">5. Approach</h2>
      <PortableText value={procedure.approach} />
    </section>
    
    <section aria-labelledby="steps-heading" class="key-steps">
      <h2 id="steps-heading">6. Key steps</h2>
      <ol class="steps-list">
        {procedure.keySteps.map((step, i) => (
          <li class="step" id={`step-${i + 1}`}>
            <h3>
              <span class="step-number">{i + 1}.</span>
              {step.title}
            </h3>
            <PortableText value={step.description} />
            
            {step.image && (
              <figure class="step-figure">
                <img 
                  src={step.image.asset.url} 
                  alt={step.image.alt}
                  loading="lazy"
                />
                {step.image.caption && (
                  <figcaption>{step.image.caption}</figcaption>
                )}
              </figure>
            )}
            
            {step.pitfall && (
              <aside class="pitfall-callout">
                <h4>Pitfall</h4>
                <p>{step.pitfall}</p>
              </aside>
            )}
          </li>
        ))}
      </ol>
    </section>
    
    {procedure.closure?.length > 0 && (
      <section aria-labelledby="closure-heading">
        <h2 id="closure-heading">7. Closure</h2>
        <PortableText value={procedure.closure} />
      </section>
    )}
    
    <section aria-labelledby="aftercare-heading">
      <h2 id="aftercare-heading">8. Aftercare</h2>
      <PortableText value={procedure.aftercare} />
    </section>
    
    <section aria-labelledby="complications-heading">
      <h2 id="complications-heading">9. Complications</h2>
      <PortableText value={procedure.complications} />
    </section>
    
    <section aria-labelledby="evidence-heading" class="evidence-section">
      <h2 id="evidence-heading">10. Evidence</h2>
      <PortableText value={procedure.evidence} />
    </section>
    
    {procedure.patientSummary?.length > 0 && (
      <details class="patient-summary">
        <summary>For patients — plain-language summary</summary>
        <PortableText value={procedure.patientSummary} />
      </details>
    )}
    
    <Bibliography references={references} />
  </article>
</BaseLayout>

<style>
  .procedure-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 60px 20px 120px;
  }
  
  .procedure-header {
    margin-bottom: 64px;
  }
  
  .procedure-category {
    font-family: var(--mono);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent);
    margin: 0 0 16px;
  }
  
  .procedure-category a {
    color: inherit;
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
  }
  
  .last-updated {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 24px;
  }
  
  section {
    margin-bottom: 64px;
  }
  
  section h2 {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 28px;
    margin: 0 0 24px;
    color: var(--ink);
  }
  
  .steps-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .step {
    margin-bottom: 48px;
    scroll-margin-top: 80px;
  }
  
  .step h3 {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 22px;
    margin: 0 0 16px;
    color: var(--ink);
  }
  
  .step-number {
    font-family: var(--mono);
    font-weight: 400;
    color: var(--accent);
    margin-right: 8px;
  }
  
  .step-figure {
    margin: 24px 0;
  }
  
  .step-figure img {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .step-figure figcaption {
    font-family: var(--sans);
    font-size: 13px;
    color: var(--ink-3);
    line-height: 1.5;
    margin-top: 8px;
    font-style: italic;
  }
  
  .pitfall-callout {
    background: var(--bg-deep);
    border-left: 3px solid var(--accent);
    padding: 16px 20px;
    margin-top: 24px;
  }
  
  .pitfall-callout h4 {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--accent);
    margin: 0 0 8px;
    font-weight: 500;
  }
  
  .pitfall-callout p {
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink);
    margin: 0;
  }
  
  .patient-summary {
    margin-top: 48px;
    padding: 24px;
    background: var(--bg-deep);
  }
  
  .patient-summary summary {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 18px;
    color: var(--accent);
    cursor: pointer;
  }
  
  .patient-summary[open] summary {
    margin-bottom: 16px;
  }
</style>
```

---

## Schema.org JSON-LD generator — `lib/schema.ts`

```typescript
// src/lib/schema.ts (excerpt for procedures)
export function generateProcedureSchema(procedure: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: procedure.title,
    procedureType: 'SurgicalProcedure',
    bodyLocation: extractAnatomy(procedure.anatomy), // helper function
    preparation: extractPreparation(procedure.positioning),
    followup: extractFollowup(procedure.aftercare),
    expectedPrognosis: extractPrognosis(procedure.complications),
    performedBy: {
      '@type': 'Physician',
      '@id': 'https://drgladysz.com/#person',
    },
    dateModified: procedure.lastUpdated,
    isPartOf: {
      '@type': 'WebPage',
      '@id': `https://drgladysz.com/en/procedures/${procedure.slug.current}`,
    },
  };
}
```

---

## Verification before each new procedure ships

- [ ] All required Sanity fields populated (schema enforces this)
- [ ] At least 2 key steps with images and (where relevant) pitfall callouts
- [ ] Evidence section cites at least 3 references
- [ ] Last-updated date set to within current quarter
- [ ] Key Points box completed (Question / Findings / Meaning)
- [ ] Schema.org `MedicalProcedure` JSON-LD validates at validator.schema.org
- [ ] Patient summary populated if procedure has high patient-search volume

---

## Effort estimate

- **Sanity schema definition:** 3-4 hours
- **Astro template build:** 4-6 hours
- **Schema.org generator + Key Points component:** 1-2 hours

**Total: 8-12 hours** for the infrastructure. Pays back on every future procedure page.

After the schema is shipped, content authoring is the ongoing cost — each procedure page is a separate authoring session by Mateusz, ideally 2-4 hours of focused writing per page.
