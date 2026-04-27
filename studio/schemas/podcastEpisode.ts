// studio/schemas/podcastEpisode.ts
// Full schema per _handoff/sanity-schemas/README.md (Tier 2, when podcast active).
import { defineType, defineField } from 'sanity';

export const podcastEpisode = defineType({
  name: 'podcastEpisode',
  title: 'Podcast episode',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Episode title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'episodeNumber', title: 'Episode number', type: 'number' }),
    defineField({ name: 'publishedDate', title: 'Published date', type: 'date', validation: (Rule) => Rule.required() }),
    defineField({ name: 'duration', title: 'Duration (minutes)', type: 'number' }),
    defineField({
      name: 'platform',
      title: 'Hosted on',
      type: 'string',
      options: {
        list: [
          { title: 'Spotify', value: 'spotify' },
          { title: 'Apple Podcasts', value: 'apple' },
          { title: 'YouTube', value: 'youtube' },
          { title: 'Other', value: 'other' },
        ],
      },
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL (where to listen)',
      type: 'url',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'embedUrl',
      title: 'Embed URL (optional)',
      type: 'url',
      description: 'Direct embed URL if hosted on Spotify/SoundCloud/etc.',
    }),
    defineField({
      name: 'showNotes',
      title: 'Show notes',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'transcript',
      title: 'Transcript (optional)',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Full transcript for SEO and accessibility. Highly recommended.',
    }),
    defineField({
      name: 'guests',
      title: 'Guests',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
  ],
});
