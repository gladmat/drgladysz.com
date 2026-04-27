// studio/schemas/mcqQuestion.ts — STUB
// Full FEBHS MCQ schema lands when MCQ feature is built (Tier 2, Feature 4).
// See _handoff/features/04-febhs-mcq.md for the complete definition.
import { defineType, defineField } from 'sanity';

export const mcqQuestion = defineType({
  name: 'mcqQuestion',
  title: 'MCQ question',
  type: 'document',
  fields: [
    defineField({
      name: 'stem',
      title: 'Question stem',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
    }),
  ],
});
