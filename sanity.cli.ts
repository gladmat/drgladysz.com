// sanity.cli.ts — Sanity CLI configuration
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  },
  deployment: {
    // App ID assigned by Sanity on first deploy of drgladysz-cms.sanity.studio.
    // Pinning it here skips the prompt on every subsequent `sanity deploy`.
    appId: 'qyqs4nkyueudjduvo2vhzcxh',
    // Auto-updates serve the latest published `sanity` package version on
    // demand to the browser, so editors get patches and minor releases
    // without a redeploy. Major version changes that require host-side
    // migrations (e.g. v4 → v5) still need a manual rebuild + redeploy.
    autoUpdates: true,
  },
});
