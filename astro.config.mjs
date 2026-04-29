// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkSectionMasthead from './src/plugins/remark-section-masthead.mjs';

export default defineConfig({
  site: 'https://drgladysz.com',

  // Astro 6: 'static' is now the unified default (the v5 'hybrid' mode was merged in).
  // Pages opt into server rendering with `export const prerender = false`.
  output: 'static',

  integrations: [
    mdx(),
    preact({ compat: true }),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-NZ',
          pl: 'pl-PL',
        },
      },
      filter: (page) => !page.includes('/studio/'),
    }),
  ],

  // i18n routing
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl'],
    routing: {
      prefixDefaultLocale: true, // Both /en/ and /pl/ are explicitly prefixed
    },
  },

  // Image optimization
  image: {
    formats: ['avif', 'webp'],
    domains: ['cdn.sanity.io'], // Allow Sanity-hosted images
  },

  // Locked 301 redirects from existing WordPress site
  redirects: {
    // English content
    '/about/': '/en/about',
    '/blog/': '/en/blog',
    '/extensor-tendon-injuries/': '/en/blog/extensor-tendon-injuries',
    '/scaphoid-fractures/': '/en/blog/scaphoid-fractures',
    '/flexor-tendon-injuries-and-repair/': '/en/blog/flexor-tendon-injuries-and-repair',
    '/carpal-tunnel-syndrome-doctors-explanation/': '/en/blog/carpal-tunnel-syndrome',
    '/homepage/contact/': '/en/contact',

    // Polish content (one existing post)
    '/zespol-ciesni-nadgarstka/': '/pl/blog/zespol-ciesni-nadgarstka',

    // Common WordPress paths
    '/wp-content/': '/en/',
    '/feed/': '/en/blog',
    '/sitemap_index.xml': '/sitemap-index.xml',
  },

  // Markdown pipeline. The section-masthead plugin recognises the locked
  // brand-spec `§ 0n — Theme` paragraph pattern in legal pages and marks it
  // with the `section-masthead` class for downstream styling.
  markdown: {
    remarkPlugins: [remarkSectionMasthead],
  },

  // Vite plugins — Tailwind 4 ships as a Vite plugin (no Astro integration in v6)
  vite: {
    plugins: [tailwindcss()],
  },
});
