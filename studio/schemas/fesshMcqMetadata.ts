// studio/schemas/fesshMcqMetadata.ts
//
// Embedded object on every fesshMcq doc. Tracks publication state, the
// audit-trail metadata that the per-question footer renders (firstPublishedDate,
// lastClinicallyReviewed, version), and a structured errataLog of community-flagged
// corrections. publicationStatus drives rendering: only `published` ever reaches
// the learn.drgladysz.com site (GROQ filters everywhere).
//
// Operating model — locked under brand spec v1.8.1 Decision #34: questions are
// single-author authored and literature-checked, not peer-reviewed in the formal
// sense. The peerReviewed/peerReviewer/peerReviewDate fields are retained for
// schema-stability with previously seeded data but are deprecated — do not
// populate them on new questions, and do not surface them in any rendered copy.
// The terms "peer-reviewed", "peer review", "expert-reviewed", "validated" are
// forbidden across the subdomain.
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
          { title: 'Authoring review pending', value: 'peer_review_pending' },
          { title: 'Ready to publish', value: 'ready_to_publish' },
          { title: 'Published (live)', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'draft',
      description:
        'Only `published` reaches the live site. The GROQ filter at the page level guarantees no other state renders. The "peer_review_pending" enum value is retained for backward-compat but its label has been renamed to "Authoring review pending" — questions are single-author authored, not peer-reviewed (Decision #34).',
    }),
    defineField({
      name: 'firstPublishedDate',
      title: 'First published',
      type: 'date',
      description:
        'Date the question was first published. Set once on first publish; never edited after. Renders in the per-question footer as part of the audit trail.',
    }),
    defineField({
      name: 'lastReviewedDate',
      title: 'Last reviewed',
      type: 'date',
      description:
        'Date the clinical content was last verified against current literature, or the date a confirmed erratum correction was applied. Renders in the per-question footer. (Renamed from `lastClinicallyReviewed` 2026-05-05 — the old field is retained `hidden: true` for back-compat with previously seeded docs and is migrated away by `audit-fix-fessh-mcq-metadata-migration.ts`.)',
    }),
    defineField({
      name: 'lastClinicallyReviewed',
      title: 'Last reviewed (DEPRECATED — renamed to `lastReviewedDate`)',
      type: 'date',
      description:
        'DEPRECATED 2026-05-05. Renamed to `lastReviewedDate`. Retained `hidden: true` so previously seeded docs remain valid against the schema; renderer reads `lastReviewedDate ?? lastClinicallyReviewed`. Migrated by `audit-fix-fessh-mcq-metadata-migration.ts`.',
      hidden: true,
    }),
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      description:
        'Question version. Starts at "1" on first publish. Increments by one on every confirmed errata correction (e.g. "1" → "2" → "3"). Renders in the per-question footer as "v{n}".',
      initialValue: '1',
    }),
    defineField({
      name: 'errataLog',
      title: 'Errata log',
      type: 'array',
      description:
        'Audit trail of community-flagged corrections. Each entry records the flag date, a brief summary of the issue, and the resolution applied. An open (unresolved) entry blocks main-site cross-linking per the 30-day rule (Decision #34).',
      of: [
        {
          type: 'object',
          name: 'erratumEntry',
          fields: [
            defineField({
              name: 'date',
              title: 'Date flagged',
              type: 'date',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'summary',
              title: 'Issue summary',
              type: 'text',
              rows: 2,
              validation: (Rule) => Rule.required().max(280),
              description:
                'One-sentence summary of what was flagged. Anonymous — do not include reporter identity.',
            }),
            defineField({
              name: 'resolution',
              title: 'Resolution',
              type: 'string',
              options: {
                list: [
                  { title: 'Open (under review)', value: 'open' },
                  { title: 'Corrected (version incremented)', value: 'corrected' },
                  { title: 'No change required', value: 'no_change' },
                  { title: 'Duplicate of earlier flag', value: 'duplicate' },
                  { title: 'Superseded by later flag', value: 'superseded' },
                ],
                layout: 'radio',
              },
              validation: (Rule) => Rule.required(),
              initialValue: 'open',
            }),
            defineField({
              name: 'resolutionNotes',
              title: 'Resolution notes',
              type: 'text',
              rows: 2,
              description:
                'Optional brief description of what was changed (or why no change was needed).',
            }),
          ],
          preview: {
            select: { date: 'date', summary: 'summary', resolution: 'resolution' },
            prepare: ({ date, summary, resolution }) => ({
              title: `${date ?? '?'} · ${resolution ?? 'open'}`,
              subtitle: summary?.slice(0, 80) ?? '',
            }),
          },
        },
      ],
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
