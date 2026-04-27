// studio/schemas/glossaryTerm.ts — STUB
// Full schema lands when Glossary system is built (Tier 2, Feature 5).
// See _handoff/features/05-glossary-system.md for the complete definition.
import { defineType, defineField } from 'sanity';

export const glossaryTerm = defineType({
  name: 'glossaryTerm',
  title: 'Glossary term',
  type: 'document',
  fields: [
    defineField({
      name: 'term',
      title: 'Term',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'term', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDefinition',
      title: 'Short definition',
      type: 'text',
      rows: 2,
    }),
  ],
});
