// studio/schemas/author.ts
import { defineType, defineField } from 'sanity';

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Full name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'credentials',
      title: 'Credentials',
      type: 'string',
      description: 'e.g., "MD, FEBOPRAS, FEBHS"',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g., "Consultant Plastic and Hand Surgeon"',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Short bio',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'orcid',
      title: 'ORCID ID',
      type: 'string',
    }),
    defineField({
      name: 'linkedin',
      title: 'LinkedIn URL',
      type: 'url',
    }),
    defineField({
      name: 'affiliations',
      title: 'Affiliations',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'name',
              type: 'string',
              title: 'Organisation name',
              validation: (Rule) => Rule.required(),
            },
            { name: 'role', type: 'string', title: 'Role / position' },
            { name: 'url', type: 'url', title: 'Organisation URL' },
          ],
          preview: {
            select: { title: 'name', subtitle: 'role' },
          },
        },
      ],
      description:
        'Hospitals, learned societies, editorial boards — anything that backs E-E-A-T. Emitted as schema.org Physician.affiliation.',
    }),
    defineField({
      name: 'alumniOf',
      title: 'Alumni of',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'name',
              type: 'string',
              title: 'Institution name',
              validation: (Rule) => Rule.required(),
            },
            { name: 'url', type: 'url', title: 'Institution URL' },
          ],
          preview: {
            select: { title: 'name' },
          },
        },
      ],
      description:
        'Universities and training hospitals. Emitted as schema.org Person.alumniOf — a strong E-E-A-T signal for medical content.',
    }),
    defineField({
      name: 'knowsAbout',
      title: 'Knows about (topics)',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Schema.org Person.knowsAbout — drives topical authority signals. Use English noun phrases (e.g. "Hand surgery", "Carpal tunnel syndrome", "Free flap reconstruction"). These also flow into Google Knowledge Graph candidate sets.',
    }),
    defineField({
      name: 'sameAs',
      title: 'External profile URLs (sameAs)',
      type: 'array',
      of: [{ type: 'url' }],
      description:
        'ORCID, LinkedIn, PWZ register URL, MCNZ register URL, Wikidata Q-ID URL, society profile pages. Emitted as schema.org Person.sameAs — disambiguates the named author across the web. Keep ORCID + LinkedIn even though they live in their own fields; sameAs is the schema.org-canonical place to publish them.',
    }),
  ],
});
