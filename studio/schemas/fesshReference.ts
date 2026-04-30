// studio/schemas/fesshReference.ts
//
// Bibliographic reference for FESSH MCQ statements. Parallel to (and
// independent of) bibReference, which serves articles and procedure pages.
// Two reference types coexist because they have different semantic models:
//   - bibReference uses pubType (journal/book/chapter/conference/online/guideline)
//   - fesshReference uses referenceType (journal_article/textbook/book_chapter/guideline)
//     and adds ISBN-10/13, doiNote (for "no DOI assigned"), pubmedUrl
//
// Migration to a unified type was considered and deferred — neither dataset
// references the other, and the package was authored against fesshReference.
//
// Validation: at least one identifier (PMID, DOI, ISBN-13, or pubmedUrl) so
// every reference is locatable by a reader.
import { defineType, defineField } from 'sanity';

export const fesshReference = defineType({
  name: 'fesshReference',
  title: 'FESSH Reference',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Type & authors', default: true },
    { name: 'source', title: 'Source details' },
    { name: 'identifiers', title: 'Identifiers' },
  ],
  fields: [
    defineField({
      name: 'referenceType',
      title: 'Reference type',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Journal article', value: 'journal_article' },
          { title: 'Textbook', value: 'textbook' },
          { title: 'Book chapter', value: 'book_chapter' },
          { title: 'Guideline', value: 'guideline' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      initialValue: 'journal_article',
    }),
    defineField({
      name: 'authors',
      title: 'Authors (Vancouver style: "Surname FN")',
      type: 'array',
      group: 'meta',
      of: [{ type: 'string' }],
      validation: (Rule) => Rule.required().min(1),
      description:
        'Vancouver convention. Example: ["Dellon AL", "Mackinnon SE"]. No commas inside individual entries.',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'meta',
      validation: (Rule) => Rule.required().integer().min(1800).max(new Date().getFullYear() + 1),
    }),
    defineField({
      name: 'journal',
      title: 'Journal (full name)',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) => parent?.referenceType !== 'journal_article',
    }),
    defineField({
      name: 'journalAbbreviation',
      title: 'Journal abbreviation (NLM)',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) => parent?.referenceType !== 'journal_article',
    }),
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) => parent?.referenceType !== 'journal_article',
    }),
    defineField({
      name: 'issue',
      title: 'Issue',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) => parent?.referenceType !== 'journal_article',
    }),
    defineField({
      name: 'pages',
      title: 'Pages',
      type: 'string',
      group: 'source',
      description: 'e.g. "199-205"',
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) =>
        parent?.referenceType !== 'textbook' && parent?.referenceType !== 'book_chapter',
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) =>
        parent?.referenceType !== 'textbook' && parent?.referenceType !== 'book_chapter',
    }),
    defineField({
      name: 'publisherCity',
      title: 'Publisher city',
      type: 'string',
      group: 'source',
      hidden: ({ parent }) =>
        parent?.referenceType !== 'textbook' && parent?.referenceType !== 'book_chapter',
    }),
    defineField({
      name: 'pmid',
      title: 'PMID',
      type: 'string',
      group: 'identifiers',
    }),
    defineField({
      name: 'pmcid',
      title: 'PMC ID',
      type: 'string',
      group: 'identifiers',
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      type: 'string',
      group: 'identifiers',
    }),
    defineField({
      name: 'doiNote',
      title: 'DOI note',
      type: 'string',
      group: 'identifiers',
      description: 'Optional note such as "no DOI assigned" for items without a DOI.',
    }),
    defineField({
      name: 'isbn10',
      title: 'ISBN-10',
      type: 'string',
      group: 'identifiers',
      hidden: ({ parent }) => parent?.referenceType !== 'textbook',
    }),
    defineField({
      name: 'isbn13',
      title: 'ISBN-13',
      type: 'string',
      group: 'identifiers',
      hidden: ({ parent }) => parent?.referenceType !== 'textbook',
    }),
    defineField({
      name: 'pubmedUrl',
      title: 'PubMed URL',
      type: 'url',
      group: 'identifiers',
    }),
  ],
  // Custom doc-level validation: every reference must have at least one
  // locatable identifier so a reader can find the source. PMID, DOI,
  // ISBN-13, or PubMed URL all satisfy this. (Catalogued textbooks should
  // have ISBN-13; journal articles should have PMID or DOI.)
  validation: (Rule) =>
    Rule.custom((doc: any) => {
      if (!doc) return true;
      const hasIdentifier =
        Boolean(doc.pmid) ||
        Boolean(doc.doi) ||
        Boolean(doc.isbn13) ||
        Boolean(doc.pubmedUrl);
      if (!hasIdentifier) {
        return 'At least one identifier required: PMID, DOI, ISBN-13, or PubMed URL';
      }
      return true;
    }),
  preview: {
    select: {
      authors: 'authors',
      title: 'title',
      journal: 'journalAbbreviation',
      year: 'year',
      type: 'referenceType',
    },
    prepare({ authors, title, journal, year, type }) {
      const firstAuthor = authors?.[0] ?? 'Unknown';
      const etAl = authors && authors.length > 1 ? ' et al.' : '';
      const source = journal || (type === 'textbook' ? 'Textbook' : '');
      return {
        title: `${firstAuthor}${etAl} (${year ?? '?'})`,
        subtitle: source ? `${source} — ${title}` : title,
      };
    },
  },
  orderings: [
    {
      title: 'First author A–Z',
      name: 'authorAsc',
      by: [{ field: 'authors[0]', direction: 'asc' }],
    },
    {
      title: 'Year (newest first)',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
  ],
});
