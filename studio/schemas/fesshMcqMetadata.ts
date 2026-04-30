// studio/schemas/fesshMcqMetadata.ts
//
// Embedded object on every fesshMcq doc — peer-review tracking and
// publication state.
//
// publicationStatus drives rendering: only `published` ever reaches the
// learn.drgladysz.com site (GROQ filters everywhere). Drafts can accumulate
// freely while peer review is being arranged. The verificationNotes field
// is internal-only and never rendered.
import { defineType, defineField } from 'sanity';

export const fesshMcqMetadata = defineType({
  name: 'fesshMcqMetadata',
  title: 'FESSH MCQ Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'publicationStatus',
      title: 'Publication status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft (do not publish)', value: 'draft' },
          { title: 'Peer review pending', value: 'peer_review_pending' },
          { title: 'Ready to publish', value: 'ready_to_publish' },
          { title: 'Published (live)', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'draft',
      description:
        'Only `published` reaches the live site. The GROQ filter at the page level guarantees no other state renders.',
    }),
    defineField({
      name: 'peerReviewed',
      title: 'Peer reviewed',
      type: 'boolean',
      initialValue: false,
      description:
        'Whether the question has passed peer review. Required true before publicationStatus can move to ready_to_publish or published.',
    }),
    defineField({
      name: 'peerReviewer',
      title: 'Peer reviewer',
      type: 'string',
      description:
        'Name + credentials of the reviewer (FEBHS-credentialled or senior hand surgeon). Required before publishing.',
    }),
    defineField({
      name: 'peerReviewDate',
      title: 'Peer review date',
      type: 'date',
    }),
    defineField({
      name: 'lastClinicallyReviewed',
      title: 'Last clinically reviewed',
      type: 'date',
      description:
        'Date the clinical content was last verified against current literature. Re-review cadence varies by topic.',
    }),
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      description: 'Semver-ish version of the question (e.g. "1.0", "1.1").',
      initialValue: '1.0',
    }),
    defineField({
      name: 'originallyAuthored',
      title: 'Originally authored',
      type: 'string',
      description: 'Year or year range when the question was first drafted (free-form).',
    }),
    defineField({
      name: 'verificationNotes',
      title: 'Verification notes (internal)',
      type: 'text',
      rows: 3,
      description: 'Internal audit trail. Never rendered on the live site.',
    }),
  ],
});
