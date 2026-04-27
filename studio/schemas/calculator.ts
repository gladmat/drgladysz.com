// studio/schemas/calculator.ts — STUB
// Full schema (QuickDASH/PRWE/Boston CTS/MHQ/Mayo Wrist + 6-tab content)
// lands when Calculators feature is built (Tier 2, Feature 3).
// See _handoff/features/03-calculator-suite.md for the complete definition.
import { defineType, defineField } from 'sanity';

export const calculator = defineType({
  name: 'calculator',
  title: 'Calculator',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Calculator name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
  ],
});
