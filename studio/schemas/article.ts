// studio/schemas/article.ts
import { defineType, defineField } from 'sanity';

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'content', title: 'Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Patient information', value: 'patient' },
          { title: 'Expert blog', value: 'expert' },
          { title: 'FESSH preparation', value: 'fessh-prep' },
          { title: 'News / commentary', value: 'news' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'audience',
      title: 'Primary audience',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Patient', value: 'patient' },
          { title: 'Peer (clinician)', value: 'peer' },
          { title: 'Mixed', value: 'mixed' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedDate',
      title: 'Published date',
      type: 'date',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last clinically reviewed',
      type: 'date',
      group: 'meta',
      description: 'For clinical articles. Display this prominently. Update at least annually.',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (for cards and SEO)',
      type: 'text',
      rows: 3,
      group: 'meta',
      description:
        'Short summary used in card listings, JSON-LD description, and meta description. Distinct from `standfirst` (which renders as the italic editorial intro).',
      validation: (Rule) => Rule.required().max(280),
    }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst (italic editorial intro)',
      type: 'text',
      rows: 4,
      group: 'meta',
      description:
        'Italic editorial intro paragraph rendered below the byline and above the Key Points box. Optional — the [slug] template falls back to `excerpt` when absent. Target length 30-90 words.',
      validation: (Rule) => Rule.max(600),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image (optional)',
      type: 'image',
      options: { hotspot: true },
      group: 'meta',
      fields: [
        { name: 'alt', title: 'Alt text', type: 'string', validation: (Rule) => Rule.required() },
      ],
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key Points box',
      type: 'object',
      group: 'content',
      fields: [
        { name: 'question', title: 'Question', type: 'string' },
        { name: 'findings', title: 'Findings', type: 'string' },
        { name: 'meaning', title: 'Meaning', type: 'text', rows: 3 },
      ],
      description: 'Optional JAMA-style summary at top of article',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      validation: (Rule) => Rule.required(),
      of: [
        {
          type: 'block',
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', validation: (Rule) => Rule.required() },
                  { name: 'newTab', type: 'boolean', title: 'Open in new tab', initialValue: false },
                ],
              },
              {
                name: 'citation',
                type: 'object',
                title: 'Citation',
                fields: [
                  { name: 'reference', type: 'reference', to: [{ type: 'bibReference' }], validation: (Rule) => Rule.required() },
                ],
              },
              {
                name: 'glossaryTerm',
                type: 'object',
                title: 'Glossary term',
                fields: [
                  { name: 'term', type: 'reference', to: [{ type: 'glossaryTerm' }], validation: (Rule) => Rule.required() },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            { name: 'alt', title: 'Alt text', type: 'string', validation: (Rule) => Rule.required() },
          ],
        },
        { type: 'callout' },
      ],
    }),
    defineField({
      name: 'relatedArticles',
      title: 'Related articles',
      type: 'array',
      group: 'content',
      of: [{ type: 'reference', to: [{ type: 'article' }] }],
      description:
        'Sibling articles surfaced in the "Related" block at the end of the page. Skipped when empty.',
    }),
    defineField({
      name: 'relatedProcedures',
      title: 'Related procedures',
      type: 'array',
      group: 'content',
      of: [{ type: 'reference', to: [{ type: 'procedurePage' }] }],
      description:
        'Procedure pages surfaced in the "Related" block at the end of the page. Skipped when empty.',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title (≤60 chars)',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO meta description (≤160 chars)',
      type: 'text',
      rows: 2,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      publishedDate: 'publishedDate',
    },
    prepare({ title, category, publishedDate }) {
      return {
        title,
        subtitle: `${category} · ${publishedDate || 'unpublished'}`,
      };
    },
  },
});
