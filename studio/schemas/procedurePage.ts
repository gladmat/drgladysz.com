// studio/schemas/procedurePage.ts
//
// AO Surgery Reference-shaped procedure document. Required-field discipline
// enforces the same architectural rigor on every procedure page regardless of
// authoring fatigue. See _handoff/features/02-procedure-schema.md.
//
// Each section is its own field so that JSON-LD MedicalProcedure population
// (in src/lib/schema.ts) can map specific clinical sections to specific
// schema.org properties (bodyLocation, preparation, followup, expectedPrognosis).
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
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // === META ===
    defineField({
      name: 'title',
      title: 'Procedure title',
      type: 'string',
      group: 'meta',
      description: 'Example: "Carpal Tunnel Release (Open)".',
      validation: (Rule) => Rule.required().max(120),
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
      initialValue: 'peer',
      validation: (Rule) => Rule.required(),
      description:
        'Drives default voice register; mixed pages use glossary tooltips heavily and surface the patientSummary section.',
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last clinically reviewed',
      type: 'date',
      group: 'meta',
      validation: (Rule) => Rule.required(),
      description: 'Display this date prominently. Refresh at least annually.',
    }),
    defineField({
      name: 'summary',
      title: 'One-line summary',
      type: 'text',
      rows: 2,
      group: 'meta',
      description:
        'Plain-English single sentence used on category index cards and within the OG preview. Keep ≤ 200 chars.',
      validation: (Rule) => Rule.required().max(220),
    }),

    // === KEY POINTS BOX (JAMA-style) ===
    defineField({
      name: 'keyPoints',
      title: 'Key Points box (top-of-page summary)',
      type: 'object',
      group: 'meta',
      description:
        'JAMA-style 75-100 word summary. Rendered as a bordered box at the top of the page.',
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
          description: '2-3 sentence summary of clinical relevance.',
        },
      ],
    }),

    // === HERO IMAGE (optional) ===
    defineField({
      name: 'heroImage',
      title: 'Hero image (optional)',
      type: 'image',
      group: 'visual',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Alt text (accessibility)',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
        { name: 'caption', title: 'Caption', type: 'string' },
      ],
    }),

    // === CLINICAL CONTENT (1-9, AO Surgery Reference structure) ===
    defineField({
      name: 'indications',
      title: '1. Indications',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }, { type: 'callout' }],
      validation: (Rule) => Rule.required().min(1),
      description: 'When this procedure is clinically indicated.',
    }),
    defineField({
      name: 'contraindications',
      title: '2. Contraindications',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }, { type: 'callout' }],
      description: 'Absolute and relative contraindications.',
    }),
    defineField({
      name: 'anatomy',
      title: '3. Relevant anatomy',
      type: 'array',
      group: 'clinical',
      of: [
        { type: 'block' },
        { type: 'callout' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            {
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
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
      of: [{ type: 'block' }, { type: 'callout' }],
      description: 'Operative setup, table position, regional anaesthesia considerations.',
    }),
    defineField({
      name: 'approach',
      title: '5. Approach',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }, { type: 'callout' }],
      validation: (Rule) => Rule.required(),
      description: 'Surgical access — incision, dissection, exposure.',
    }),

    // === KEY STEPS ===
    defineField({
      name: 'keySteps',
      title: '6. Key steps (numbered, ordered)',
      type: 'array',
      group: 'clinical',
      of: [
        {
          type: 'object',
          name: 'procedureStep',
          title: 'Procedure step',
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
              validation: (Rule) => Rule.required().min(1),
            },
            {
              name: 'image',
              title: 'Step image (optional)',
              type: 'image',
              options: { hotspot: true },
              fields: [
                { name: 'caption', title: 'Caption', type: 'string' },
                {
                  name: 'alt',
                  title: 'Alt text',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
              ],
            },
            {
              name: 'pitfall',
              title: 'Pitfall callout (optional)',
              type: 'text',
              rows: 3,
              description:
                'Single-paragraph technical pitfall to avoid at this step. Rendered as an accent-bordered aside.',
            },
          ],
          preview: {
            select: { title: 'title', media: 'image' },
            prepare: ({ title, media }) => ({
              title: title || 'Untitled step',
              media,
            }),
          },
        },
      ],
      validation: (Rule) => Rule.required().min(2),
      description: 'Ordered list of key surgical steps. Minimum 2.',
    }),

    // === CLOSURE / AFTERCARE / COMPLICATIONS ===
    defineField({
      name: 'closure',
      title: '7. Closure',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }, { type: 'callout' }],
      description: 'Wound closure technique, dressings, immobilisation.',
    }),
    defineField({
      name: 'aftercare',
      title: '8. Aftercare',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }, { type: 'callout' }],
      validation: (Rule) => Rule.required(),
      description: 'Post-operative protocol, rehabilitation, follow-up timeline.',
    }),
    defineField({
      name: 'complications',
      title: '9. Complications and how to avoid them',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }, { type: 'callout' }],
      validation: (Rule) => Rule.required(),
      description: 'Known complications, their incidence, and prevention strategies.',
    }),

    // === PATIENT-FACING SUMMARY (optional) ===
    defineField({
      name: 'patientSummary',
      title: 'For patients — plain-language summary (optional)',
      type: 'array',
      group: 'clinical',
      of: [{ type: 'block' }],
      description:
        'Lay-reader explanation. Rendered as a collapsible <details> block at the foot of the page when populated.',
    }),

    // === EVIDENCE ===
    defineField({
      name: 'evidence',
      title: '10. Evidence',
      type: 'array',
      group: 'evidence',
      of: [{ type: 'block' }, { type: 'callout' }],
      validation: (Rule) => Rule.required(),
      description:
        'Discussion of supporting literature. Use the citation inline mark to attach references.',
    }),

    // === SEO ===
    defineField({
      name: 'seoTitle',
      title: 'SEO title (≤ 60 chars)',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO meta description (≤ 160 chars)',
      type: 'text',
      rows: 2,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      lastUpdated: 'lastUpdated',
      media: 'heroImage',
    },
    prepare({ title, category, lastUpdated, media }) {
      const categoryLabel = category
        ? category.replace(/-/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
        : 'Uncategorised';
      return {
        title: title || 'Untitled procedure',
        subtitle: `${categoryLabel} · Updated ${lastUpdated || '—'}`,
        media,
      };
    },
  },
});
