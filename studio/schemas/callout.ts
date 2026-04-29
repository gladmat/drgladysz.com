// studio/schemas/callout.ts
//
// Shared inline callout block, registered as a top-level Sanity object type so
// both article.body and procedurePage clinical sections can include it. Three
// flavours render different visual treatments in PortableTextRenderer.astro:
// info (neutral aside), warning (oxblood-bordered), pearl (clinical pearl /
// pitfall — accent left rule + mono cap label).
import { defineType, defineField } from 'sanity';

export const callout = defineType({
  name: 'callout',
  title: 'Callout box',
  type: 'object',
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Info — neutral aside', value: 'info' },
          { title: 'Warning — caution / red-flag', value: 'warning' },
          { title: 'Pearl / Pitfall — clinical wisdom', value: 'pearl' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title (optional)',
      type: 'string',
      description: 'Short header above the callout body. Mono caps in render.',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { type: 'type', title: 'title' },
    prepare({ type, title }) {
      const label = type === 'warning' ? 'Warning' : type === 'pearl' ? 'Pearl' : 'Info';
      return {
        title: title ? `${label} — ${title}` : label,
      };
    },
  },
});
