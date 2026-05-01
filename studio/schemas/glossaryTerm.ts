// studio/schemas/glossaryTerm.ts
//
// Glossary term — full Tier-2 shape per _handoff/features/05-glossary-system.md.
// Pulled forward from post-launch Tier 2 to support the scaphoid-fractures
// expert article (Phase 6), which references 16 glossary terms inline.
//
// The component side (GlossaryTerm.astro + PortableTextSpan wiring) ships
// alongside this schema so authored marks render with dashed-underline +
// native Popover API tooltip. The dedicated /en/glossary/[slug] index/detail
// pages remain Tier 2 — the popover's "More about this term" link is
// suppressed until those pages ship.
import { defineType, defineField } from 'sanity';

export const glossaryTerm = defineType({
  name: 'glossaryTerm',
  title: 'Glossary term',
  type: 'document',
  fields: [
    defineField({
      name: 'term',
      title: 'Term (English)',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'The term as it appears (e.g., "median nerve", "scaphoid").',
    }),
    defineField({
      name: 'termPolish',
      title: 'Term (Polish)',
      type: 'string',
      description: 'Polish equivalent if applicable (e.g., "nerw pośrodkowy").',
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      options: { source: 'term', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Anatomy', value: 'anatomy' },
          { title: 'Condition', value: 'condition' },
          { title: 'Procedure', value: 'procedure' },
          { title: 'Investigation', value: 'investigation' },
          { title: 'Treatment', value: 'treatment' },
          { title: 'Outcome measure', value: 'outcome' },
          { title: 'Anatomical structure', value: 'structure' },
          { title: 'Other', value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'other',
    }),
    defineField({
      name: 'shortDefinition',
      title: 'Short definition (for tooltip)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required().max(450),
      description:
        'Brief definition shown inside the popover. Target 400 chars; hard cap 450 to accommodate medical-precision authoring of complex terms (e.g., "bowstringing").',
    }),
    defineField({
      name: 'shortDefinitionPolish',
      title: 'Short definition (Polish)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.max(450),
    }),
    defineField({
      name: 'fullDefinition',
      title: 'Full definition (for glossary page)',
      type: 'array',
      of: [{ type: 'block' }],
      description:
        'Comprehensive definition shown on the dedicated glossary page (Tier 2).',
    }),
    defineField({
      name: 'fullDefinitionPolish',
      title: 'Full definition (Polish)',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'synonyms',
      title: 'Synonyms / alternative spellings',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      description:
        'Other words for this term (e.g., "scaphoid" might have synonym "navicular bone").',
    }),
    defineField({
      name: 'relatedTerms',
      title: 'Related terms',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'glossaryTerm' }] }],
      description:
        'Other glossary terms related to this one. Shown as cross-links on the glossary page.',
    }),
    defineField({
      name: 'illustration',
      title: 'Illustration (optional)',
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
      description: 'Small anatomical illustration shown in popover and on full page.',
    }),
    defineField({
      name: 'notesForMateusz',
      title: 'Internal notes',
      type: 'text',
      rows: 2,
      description: 'Internal notes for editorial use — never rendered.',
    }),
  ],
  preview: {
    select: {
      term: 'term',
      termPolish: 'termPolish',
      category: 'category',
    },
    prepare({ term, termPolish, category }) {
      return {
        title: term,
        subtitle: `${category}${termPolish ? ` · PL: ${termPolish}` : ''}`,
      };
    },
  },
  orderings: [
    {
      title: 'Term A-Z',
      name: 'termAsc',
      by: [{ field: 'term', direction: 'asc' }],
    },
    {
      title: 'Category, then term',
      name: 'categoryThenTerm',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'term', direction: 'asc' },
      ],
    },
  ],
});
