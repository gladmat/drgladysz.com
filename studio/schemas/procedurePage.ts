// studio/schemas/procedurePage.ts — STUB
// Full AO-Surgery-Reference structured schema lands in Phase 5 (Feature 2).
// See _handoff/features/02-procedure-schema.md for the complete definition.
import { defineType, defineField } from 'sanity';

export const procedurePage = defineType({
  name: 'procedurePage',
  title: 'Procedure page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
  ],
});
