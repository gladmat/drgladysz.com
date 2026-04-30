// studio/schemas/calculator.ts
//
// Calculator (Tier 2, Feature 3). Each Sanity doc is one calculator in one
// locale — separate-doc-per-locale model matches `article` and `procedurePage`.
// The `locale` field drives the EN/PL routing split; `slug` is allowed to
// repeat across locales (composite uniqueness via doc-id convention
// `calculator-{slug}-{locale}`).
//
// Each calculator page renders six (+1 optional) editorial sections wrapping
// an interactive Preact island. The island itself is keyed on `componentName`
// — the registry at src/components/interactive/registry.ts dispatches to the
// correct island based on this value.
//
// Portable Text fields (whenToUse, pearlsPitfalls, whyUse, nextSteps,
// evidence, creatorInsights) accept citation + glossaryTerm marks so the
// editorial wrap can cite validation papers and link out to glossary terms
// the same way articles and procedure pages do.
import { defineType, defineField } from 'sanity';

// Shared mark/annotation block — copied from article.ts so calculator prose
// supports the same citation + glossaryTerm marks. Kept inline rather than
// extracted to a shared object type because Sanity's block schema doesn't
// cleanly accept a shared `marks` config.
const PROSE_BLOCK = {
  type: 'block' as const,
  marks: {
    decorators: [
      { title: 'Bold', value: 'strong' },
      { title: 'Italic', value: 'em' },
    ],
    annotations: [
      {
        name: 'link',
        type: 'object',
        title: 'Link',
        fields: [
          { name: 'href', type: 'url', validation: (Rule: any) => Rule.required() },
          { name: 'newTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
        ],
      },
      {
        name: 'citation',
        type: 'object',
        title: 'Citation',
        fields: [
          { name: 'reference', type: 'reference', to: [{ type: 'bibReference' }], validation: (Rule: any) => Rule.required() },
        ],
      },
      {
        name: 'glossaryTerm',
        type: 'object',
        title: 'Glossary term',
        fields: [
          { name: 'term', type: 'reference', to: [{ type: 'glossaryTerm' }], validation: (Rule: any) => Rule.required() },
        ],
      },
    ],
  },
};

export const calculator = defineType({
  name: 'calculator',
  title: 'Calculator',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'content', title: 'Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Short name',
      description: 'e.g. "QuickDASH". Shown as page H1 and in indexes.',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fullName',
      title: 'Full name',
      description:
        'e.g. "Quick Disabilities of the Arm, Shoulder and Hand". Shown as a kicker beneath the H1.',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      description:
        'Used in /en/calculators/[slug] and /pl/kalkulatory/[slug]. Same slug can be used in both locales (composite uniqueness via doc-id convention).',
      type: 'slug',
      group: 'meta',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'locale',
      title: 'Locale',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'English', value: 'en' },
          { title: 'Polski', value: 'pl' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'en',
    }),
    defineField({
      name: 'componentName',
      title: 'Component name',
      description:
        'Picks the interactive island. Must match a key in src/components/interactive/registry.ts.',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'QuickDASH', value: 'quickdash' },
          { title: 'PRWE', value: 'prwe' },
          { title: 'Boston CTS Symptom Severity', value: 'boston-cts' },
          { title: 'Michigan Hand Questionnaire (MHQ)', value: 'mhq' },
          { title: 'Mayo Wrist Score', value: 'mayo-wrist' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 2,
      group: 'meta',
      description:
        'One-line summary used in cards and SEO meta description. Max 160 chars.',
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'whenToUse',
      title: 'When to use',
      type: 'array',
      group: 'content',
      of: [PROSE_BLOCK],
      description: 'Clinical scenarios where this calculator applies.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'pearlsPitfalls',
      title: 'Pearls and pitfalls',
      type: 'array',
      group: 'content',
      of: [PROSE_BLOCK],
      description:
        'Caveats around interpretation — ceiling/floor effects, populations validated in, etc.',
    }),
    defineField({
      name: 'whyUse',
      title: 'Why use it',
      type: 'array',
      group: 'content',
      of: [PROSE_BLOCK],
      description:
        'Clinical decision support — what the score adds vs alternatives.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'nextSteps',
      title: 'Next steps based on score',
      type: 'array',
      group: 'content',
      of: [PROSE_BLOCK],
      description: 'Action thresholds — what changes at 30/50/70 etc.',
    }),
    defineField({
      name: 'evidence',
      title: 'Evidence',
      type: 'array',
      group: 'content',
      of: [PROSE_BLOCK],
      description:
        'Validation papers and follow-up evidence. Use citation marks for references.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'creatorInsights',
      title: 'Creator insights (optional)',
      type: 'array',
      group: 'content',
      of: [PROSE_BLOCK],
      description: 'Personal notes on use in your own practice — optional.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title (≤60 chars)',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO meta description (≤160 chars)',
      type: 'text',
      rows: 2,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      name: 'name',
      fullName: 'fullName',
      locale: 'locale',
      componentName: 'componentName',
    },
    prepare({ name, fullName, locale, componentName }) {
      return {
        title: name,
        subtitle: `${locale?.toUpperCase() ?? 'EN'} · ${componentName ?? '?'}${fullName ? ` · ${fullName}` : ''}`,
      };
    },
  },
  orderings: [
    {
      title: 'Name A-Z',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
    {
      title: 'Locale, then name',
      name: 'localeThenName',
      by: [
        { field: 'locale', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    },
  ],
});
