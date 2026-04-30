// studio/schemas/fesshStatement.ts
//
// Embedded object: one of the 5 True/False statements per FESSH MCQ. Each
// carries its own truth value, prose explanation, primary reference, and
// optional secondary references.
//
// The FESSH question format is "5 statements per stem, mark each True or
// False" — different from the standard "stem with N options, pick one".
// This object is consumed by fesshMcq.statements (array of length 5).
import { defineType, defineField } from 'sanity';

export const fesshStatement = defineType({
  name: 'fesshStatement',
  title: 'FESSH Statement',
  type: 'object',
  fields: [
    defineField({
      name: 'order',
      title: 'Order (1–5)',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1).max(5),
      description: 'Position within the question. Must be unique across the 5 statements.',
    }),
    defineField({
      name: 'text',
      title: 'Statement text',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().min(10),
      description: 'The statement the reader marks True or False. Tight clinical paraphrase, no hedging.',
    }),
    defineField({
      name: 'isTrue',
      title: 'Is true?',
      type: 'boolean',
      validation: (Rule) => Rule.required(),
      initialValue: false,
      description: 'Whether the statement is correct as written.',
    }),
    defineField({
      name: 'explanation',
      title: 'Explanation',
      type: 'text',
      rows: 6,
      validation: (Rule) => Rule.required().min(40),
      description:
        'Why the statement is true or false. Plain prose; cite the primary reference inline by author + year (the rendered citation expands automatically below).',
    }),
    defineField({
      name: 'primaryReference',
      title: 'Primary reference',
      type: 'reference',
      to: [{ type: 'fesshReference' }],
      validation: (Rule) => Rule.required(),
      description: 'Single primary literature source supporting this statement.',
    }),
    defineField({
      name: 'secondaryReferences',
      title: 'Secondary references',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'fesshReference' }] }],
      description: 'Optional supporting references.',
    }),
  ],
  preview: {
    select: { order: 'order', text: 'text', isTrue: 'isTrue' },
    prepare({ order, text, isTrue }) {
      const snippet = (text ?? '').substring(0, 80);
      const ellipsis = text && text.length > 80 ? '…' : '';
      return {
        title: `${order ?? '?'}. ${snippet}${ellipsis}`,
        subtitle: isTrue ? '✓ TRUE' : '✗ FALSE',
      };
    },
  },
});
