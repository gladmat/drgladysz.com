// studio/schemas/fesshMcq.ts
//
// FESSH MCQ question document. Format: stem (one-line setup) + 5 True/False
// statements. Each statement has its own truth value, explanation, primary
// reference, and optional secondaries. This is the FESSH exam format —
// different from the standard "stem with N options, pick one" model.
//
// Categories cover the FESSH curriculum at scale (~180 questions / 3 mock
// exams). The 8 categories used by the seed package are extended to 12 to
// give room for growth without schema churn.
//
// Custom validators:
//   - statements: exactly 5 entries, with unique `order` values 1..5
//   - slug: unique within (category, locale=en) — enforced via custom isUnique
//
// Rendering: only `metadata.publicationStatus == "published"` reaches the
// live site. The GROQ filter is in learn/src/lib/sanity.ts.
import { defineType, defineField } from 'sanity';

export const fesshMcq = defineType({
  name: 'fesshMcq',
  title: 'FESSH MCQ Question',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'content', title: 'Stem & statements' },
    { name: 'review', title: 'Review & metadata' },
  ],
  fields: [
    defineField({
      name: 'questionId',
      title: 'Question ID',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required().regex(/^FESSH-\d{3,4}$/),
      description: 'Stable human-readable ID (e.g. "FESSH-001"). Used for cross-references and audit trails. Format: FESSH-NNN or FESSH-NNNN.',
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
      description: 'Short title shown as the question H1 (e.g. "Wartenberg syndrome").',
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'meta',
      options: {
        source: 'topic',
        maxLength: 96,
        // Composite uniqueness: same slug allowed in different categories.
        // Useful at scale when "anatomy" and "examination" both have a
        // "median nerve" question.
        isUnique: async (slug, context) => {
          const { document, getClient } = context as any;
          if (!document?.category) return true;
          const client = getClient({ apiVersion: '2026-01-01' });
          const id = document._id.replace(/^drafts\./, '');
          const existing = await client.fetch(
            /* groq */ `count(*[_type == "fesshMcq" && slug.current == $slug && category == $category && !(_id in [$id, "drafts." + $id])])`,
            {
              slug,
              category: document.category,
              id,
            },
          );
          return existing === 0;
        },
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Anatomy', value: 'anatomy' },
          { title: 'Physical examination', value: 'examination' },
          { title: 'Imaging', value: 'imaging' },
          { title: 'Compressive neuropathies', value: 'compressive-neuropathies' },
          { title: 'Peripheral nerve injury', value: 'peripheral-nerve-injury' },
          { title: 'Tendon injuries', value: 'tendon-injuries' },
          { title: 'Wrist trauma', value: 'wrist-trauma' },
          { title: 'Hand tumours', value: 'hand-tumours' },
          { title: 'Dupuytren disease', value: 'dupuytren-disease' },
          { title: 'Rheumatoid hand', value: 'rheumatoid-hand' },
          { title: 'Congenital hand', value: 'congenital-hand' },
          { title: 'Microsurgery', value: 'microsurgery' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subCategory',
      title: 'Sub-category',
      type: 'string',
      group: 'meta',
      description:
        'Optional finer grouping (e.g. "radial-nerve", "median-nerve", "prognosis-recurrence"). Free-form lowercase-hyphenated.',
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Basic', value: 'basic' },
          { title: 'Intermediate', value: 'intermediate' },
          { title: 'Advanced', value: 'advanced' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'intermediate',
    }),
    defineField({
      name: 'stem',
      title: 'Question stem',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (Rule) => Rule.required().min(10),
      description:
        'One-line setup framing the 5 statements (e.g. "Regarding compression of the superficial branch of the radial nerve …"). Plain prose; no inline citations.',
    }),
    defineField({
      name: 'statements',
      title: 'Statements (exactly 5)',
      type: 'array',
      group: 'content',
      of: [{ type: 'fesshStatement' }],
      validation: (Rule) =>
        Rule.required()
          .length(5)
          .custom((statements: any) => {
            if (!Array.isArray(statements)) return true;
            const orders = statements.map((s: any) => s?.order).filter((o: any) => typeof o === 'number');
            const expected = [1, 2, 3, 4, 5];
            const sorted = [...orders].sort((a, b) => a - b);
            const matches =
              sorted.length === 5 && sorted.every((v, i) => v === expected[i]);
            if (!matches) {
              return 'Statements must have exactly five entries with unique order values 1..5';
            }
            return true;
          }),
    }),
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'fesshMcqMetadata',
      group: 'review',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      questionId: 'questionId',
      topic: 'topic',
      category: 'category',
      status: 'metadata.publicationStatus',
    },
    prepare({ questionId, topic, category, status }) {
      return {
        title: `${questionId} — ${topic}`,
        subtitle: `${category ?? '?'} · ${status ?? 'no status'}`,
      };
    },
  },
  orderings: [
    {
      title: 'Question ID',
      name: 'questionIdAsc',
      by: [{ field: 'questionId', direction: 'asc' }],
    },
    {
      title: 'Category, then ID',
      name: 'categoryThenId',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'questionId', direction: 'asc' },
      ],
    },
    {
      title: 'Status, then ID',
      name: 'statusThenId',
      by: [
        { field: 'metadata.publicationStatus', direction: 'asc' },
        { field: 'questionId', direction: 'asc' },
      ],
    },
  ],
});
