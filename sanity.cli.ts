// sanity.cli.ts — Sanity CLI configuration
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  },
});
