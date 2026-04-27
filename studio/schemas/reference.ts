// studio/schemas/reference.ts — STUB
// Full schema lands in Phase 5 (Feature 1: Citation system).
// See _handoff/features/01-citation-system.md for the complete definition.
import { defineType, defineField } from 'sanity';

export const reference = defineType({
  name: 'reference',
  title: 'Reference (citation source)',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      type: 'string',
    }),
    defineField({
      name: 'pmid',
      title: 'PubMed ID',
      type: 'string',
    }),
  ],
});
