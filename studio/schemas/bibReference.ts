// studio/schemas/bibReference.ts
//
// Full Vancouver/AMA-shaped bibliographic reference document. Drives the
// citation system (sidenotes on desktop, native Popover API on mobile) and
// the end-of-article bibliography. See _handoff/features/01-citation-system.md.
//
// NOTE: the document is named `bibReference` rather than `reference` because
// "reference" is a reserved Sanity type name — Sanity's built-in reference
// type (cross-document pointer) collides with custom document types of the
// same name. Studio shows it as "Reference (citation source)".
//
// Authors are stored as plain strings ("Smith JK"). The Vancouver formatter
// in src/lib/citations.ts splits on whitespace into family/given.
import { defineType, defineField } from 'sanity';

export const bibReference = defineType({
  name: 'bibReference',
  title: 'Reference (citation source)',
  type: 'document',
  groups: [
    { name: 'core', title: 'Core', default: true },
    { name: 'identifiers', title: 'Identifiers' },
    { name: 'context', title: 'Context (preview, type)' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Article title',
      type: 'string',
      group: 'core',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'core',
      description:
        'One per entry. Format: "Smith JK" — surname, space, run-together initials. ICMJE: list 6 then "et al." (the formatter handles truncation).',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'journal',
      title: 'Journal / source',
      type: 'string',
      group: 'core',
      description:
        'NLM abbreviation when available (e.g., "J Hand Surg Am"). For books, use book title.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'core',
      validation: (Rule) =>
        Rule.required()
          .integer()
          .min(1900)
          .max(new Date().getFullYear() + 1),
    }),
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'string',
      group: 'core',
    }),
    defineField({
      name: 'issue',
      title: 'Issue',
      type: 'string',
      group: 'core',
    }),
    defineField({
      name: 'pages',
      title: 'Pages',
      type: 'string',
      group: 'core',
      description: 'Format: "123-130" or "123-30" (Vancouver allows abbreviated).',
    }),
    defineField({
      name: 'pmid',
      title: 'PubMed ID (PMID)',
      type: 'string',
      group: 'identifiers',
      description: 'Numeric PubMed identifier — used to build the PubMed deep link.',
      validation: (Rule) =>
        Rule.regex(/^\d+$/, { name: 'numeric PMID' }).custom((value) => {
          if (!value) return true;
          return /^\d+$/.test(value) || 'PMID must be numeric';
        }),
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      type: 'string',
      group: 'identifiers',
      description:
        'Without "https://doi.org/" prefix. Example: "10.1016/j.jhsa.2024.001". The component prepends doi.org/.',
    }),
    defineField({
      name: 'pmcid',
      title: 'PMC ID',
      type: 'string',
      group: 'identifiers',
      description: 'PubMed Central identifier (open access). Format: "PMC1234567".',
    }),
    defineField({
      name: 'url',
      title: 'URL (last resort)',
      type: 'url',
      group: 'identifiers',
      description:
        'Use only when no DOI/PMID exists (online-only articles, guidelines, news).',
    }),
    defineField({
      name: 'pubType',
      title: 'Publication type',
      type: 'string',
      group: 'context',
      options: {
        list: [
          { title: 'Journal article', value: 'journal' },
          { title: 'Book', value: 'book' },
          { title: 'Book chapter', value: 'chapter' },
          { title: 'Conference proceedings', value: 'conference' },
          { title: 'Online article', value: 'online' },
          { title: 'Guideline / consensus', value: 'guideline' },
        ],
      },
      initialValue: 'journal',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editors',
      title: 'Editors (book chapters only)',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'context',
      description:
        'Required for book chapters. Format same as authors: "Smith JK".',
      hidden: ({ parent }) => parent?.pubType !== 'chapter',
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher (books / chapters)',
      type: 'string',
      group: 'context',
      hidden: ({ parent }) =>
        parent?.pubType !== 'book' && parent?.pubType !== 'chapter',
    }),
    defineField({
      name: 'publisherLocation',
      title: 'Publisher location (books / chapters)',
      type: 'string',
      group: 'context',
      description: 'City, country. Example: "Stuttgart, Germany".',
      hidden: ({ parent }) =>
        parent?.pubType !== 'book' && parent?.pubType !== 'chapter',
    }),
    defineField({
      name: 'edition',
      title: 'Edition (books / chapters)',
      type: 'string',
      group: 'context',
      description: 'Example: "3rd". Omit for first edition.',
      hidden: ({ parent }) =>
        parent?.pubType !== 'book' && parent?.pubType !== 'chapter',
    }),
    defineField({
      name: 'abstractPreview',
      title: 'Abstract preview (optional)',
      type: 'text',
      rows: 4,
      group: 'context',
      description:
        'First 2-3 sentences of abstract. Shown inside the sidenote / popover for context.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author0: 'authors.0',
      authorCount: 'authors',
      year: 'year',
      journal: 'journal',
      pubType: 'pubType',
    },
    prepare({ title, author0, authorCount, year, journal, pubType }) {
      const firstAuthor = author0 || 'Unknown';
      const etAl = Array.isArray(authorCount) && authorCount.length > 1 ? ' et al.' : '';
      const typeMarker = pubType && pubType !== 'journal' ? ` · ${pubType}` : '';
      return {
        title,
        subtitle: `${firstAuthor}${etAl} — ${journal} ${year}${typeMarker}`,
      };
    },
  },
  orderings: [
    {
      title: 'Year (newest first)',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
    {
      title: 'First author A-Z',
      name: 'authorAsc',
      by: [{ field: 'authors.0', direction: 'asc' }],
    },
  ],
});
