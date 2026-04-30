// studio/schemas/fesshMockExam.ts
//
// Curated mock exam — a hand-picked set of fesshMcq references that the
// learn.drgladysz.com sub-app can run in either "practice" mode (per-
// question feedback) or "exam" mode (timed, blind, scored at end).
//
// Three exams of ~60 questions each are planned (180 question total content
// budget, three full mock papers). Curation is editorial: balance topic
// coverage by category, mix difficulty, avoid duplicates between papers.
//
// Soft-validation: each referenced question's metadata.publicationStatus
// SHOULD be 'published' before this exam is set to 'published', but the
// schema doesn't enforce it as a hard error (lets editors stage exams
// against draft questions during preparation).
import { defineType, defineField } from 'sanity';

export const fesshMockExam = defineType({
  name: 'fesshMockExam',
  title: 'FESSH Mock Exam',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'questions', title: 'Questions' },
    { name: 'review', title: 'Review' },
  ],
  fields: [
    defineField({
      name: 'examNumber',
      title: 'Exam number',
      type: 'number',
      group: 'meta',
      validation: (Rule) => Rule.required().integer().min(1),
      description:
        'Sequential number for ordering (1, 2, 3, …). Drives the default sort on the /mock-exams index.',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
      description: 'Editor-facing title (e.g. "Mock Exam 1: Compressive neuropathies & Dupuytren").',
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
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'meta',
      rows: 3,
      validation: (Rule) => Rule.required().max(400),
      description:
        'One paragraph: what this exam covers, who it is best for, anything notable about the question mix. Shown on the exam landing page.',
    }),
    defineField({
      name: 'durationMinutes',
      title: 'Exam-mode duration (minutes)',
      type: 'number',
      group: 'meta',
      validation: (Rule) => Rule.required().integer().min(15).max(240),
      initialValue: 90,
      description: 'Time limit for exam mode. Practice mode is untimed.',
    }),
    defineField({
      name: 'passingThreshold',
      title: 'Passing threshold (%)',
      type: 'number',
      group: 'meta',
      validation: (Rule) => Rule.min(0).max(100),
      description:
        'Optional. Informational only — shown alongside the score, not enforced. Typical FESSH pass mark is 60–65%.',
    }),
    defineField({
      name: 'questions',
      title: 'Questions in this exam',
      type: 'array',
      group: 'questions',
      of: [{ type: 'reference', to: [{ type: 'fesshMcq' }] }],
      validation: (Rule) =>
        Rule.required()
          .min(20)
          .max(80)
          .custom((refs: any) => {
            if (!Array.isArray(refs)) return true;
            const ids = refs.map((r: any) => r?._ref).filter(Boolean);
            const unique = new Set(ids);
            if (unique.size !== ids.length) {
              return 'Each question can appear at most once in a mock exam';
            }
            return true;
          }),
      description:
        'Curated, ordered list of question references. Typically 60. The exam runner presents them in this order; randomization (if ever wanted) is a runtime decision.',
    }),
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'fesshMcqMetadata',
      group: 'review',
      validation: (Rule) => Rule.required(),
      description:
        'Same review-state shape as individual questions. Only `published` mock exams render on the live site.',
    }),
  ],
  preview: {
    select: {
      examNumber: 'examNumber',
      title: 'title',
      questions: 'questions',
      duration: 'durationMinutes',
      status: 'metadata.publicationStatus',
    },
    prepare({ examNumber, title, questions, duration, status }) {
      const count = Array.isArray(questions) ? questions.length : 0;
      return {
        title: `Mock Exam ${examNumber ?? '?'}: ${title ?? 'Untitled'}`,
        subtitle: `${count} questions · ${duration ?? '?'} min · ${status ?? 'no status'}`,
      };
    },
  },
  orderings: [
    {
      title: 'Exam number',
      name: 'examNumberAsc',
      by: [{ field: 'examNumber', direction: 'asc' }],
    },
  ],
});
