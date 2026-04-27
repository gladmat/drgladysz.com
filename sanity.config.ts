// sanity.config.ts — Sanity Studio configuration for drgladysz.com
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './studio/schemas';

export default defineConfig({
  name: 'drgladysz',
  title: 'drgladysz.com — Sanity Studio',
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  basePath: '/studio',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('article').title('Articles'),
            S.documentTypeListItem('procedurePage').title('Procedure pages'),
            S.documentTypeListItem('reference').title('References'),
            S.divider(),
            S.documentTypeListItem('glossaryTerm').title('Glossary terms'),
            S.documentTypeListItem('mcqQuestion').title('MCQ questions'),
            S.documentTypeListItem('calculator').title('Calculators'),
            S.documentTypeListItem('podcastEpisode').title('Podcast episodes'),
            S.divider(),
            S.documentTypeListItem('author').title('Authors'),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
});
