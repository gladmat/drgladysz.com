// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import remarkSectionMasthead from './src/plugins/remark-section-masthead.mjs';

export default defineConfig({
  site: 'https://drgladysz.com',

  // Astro 6: 'static' is now the unified default (the v5 'hybrid' mode was merged in).
  // Pages opt into server rendering with `export const prerender = false`.
  // /api/contact is the only on-demand route at launch (Resend dispatch).
  output: 'static',
  adapter: vercel(),

  // Trailing-slash everywhere so canonical / sitemap / Astro.url.pathname
  // all agree. Pre-this-change, dynamic routes emitted canonicals without
  // trailing slash while static directory routes emitted them with one,
  // splitting indexed-URL link equity. Sitemap already used trailing
  // slashes; this aligns canonicals to match.
  trailingSlash: 'always',

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
      filter: (page) => {
        // Allow only locale-prefixed canonical content URLs. Astro's sitemap
        // otherwise also emits every redirect source from the `redirects:`
        // block below (apex `/`, WP-era slugs, MCQ sub-app paths, etc.),
        // which Google then flags as "Page with redirect" in the sitemap.
        const path = new URL(page).pathname;
        if (!path.startsWith('/en/') && !path.startsWith('/pl/')) return false;
        if (path.startsWith('/en/learn') || path.startsWith('/pl/nauka')) return false;
        return true;
      },
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

  // Content Security Policy (stable in Astro 6). Astro emits a per-page
  // <meta http-equiv="content-security-policy"> carrying script-src with
  // sha256 hashes for its bundled inline scripts (the island hydration
  // bootstraps on /en/operation-notes/*) — this is what makes an enforcing
  // policy possible without 'unsafe-inline' for scripts. frame-ancestors
  // is ignored in meta CSP, so it ships as the (enforcing) header in
  // vercel.json instead. The two halves don't overlap, so there is no
  // multiple-policy intersection to reason about.
  security: {
    csp: {
      scriptDirective: {
        resources: ["'self'"],
      },
      styleDirective: {
        // Astro always pins hashes for its island-runtime styles into
        // style-src, and per the CSP spec a hash neutralises
        // 'unsafe-inline' in the same directive — so this 'unsafe-inline'
        // only matters for pre-CSP3 browsers. Modern browsers get style
        // attributes via style-src-attr below.
        resources: ["'self'", "'unsafe-inline'"],
      },
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://cdn.sanity.io",
        "font-src 'self' data:",
        // plausible.io: the self-hosted /js/plausible.js posts events to
        // plausible.io's collection API (data-api in BaseLayout).
        "connect-src 'self' https://plausible.io https://cdn.sanity.io",
        "object-src 'none'",
        "base-uri 'self'",
        // style-src-attr is REQUIRED: Astro pins island-runtime style
        // hashes into style-src, and a hash in style-src makes browsers
        // ignore its 'unsafe-inline' — without this directive every
        // style="" attribute breaks (PhotoBreak figureStyle, Standfirst
        // custom property, GlossaryTerm anchor positioning, the underline
        // decorator in PortableTextSpan). Astro's config schema doesn't
        // (yet) allowlist "style-src-attr" as its own entry, but entries
        // are validated with startsWith() and serialized verbatim with
        // ';' joins — so it ships appended to form-action. If an Astro
        // upgrade tightens that validation, the build fails loudly here:
        // re-split this entry once "style-src-attr" is allowlisted.
        "form-action 'self'; style-src-attr 'unsafe-inline'",
      ],
    },
  },

  // Locked 301 redirects from existing WordPress site, plus subdomain
  // redirects for the FEBHS MCQ sub-application (per brand spec v1.8
  // Decision #29/30 — MCQ lives on learn.drgladysz.com, not the main domain).
  redirects: {
    // Bare apex → English (default locale). With `prefixDefaultLocale: true`,
    // `/` would otherwise 404. Polish-browser detection isn't done at launch
    // because the full PL site is still in composition; revisit when /pl/
    // becomes a real home page.
    '/': '/en/',

    // English content. Destinations include the trailing slash to match
    // the site-wide trailingSlash: 'always' policy — without this Vercel
    // would 308-redirect to add the slash, doubling the hop.
    '/about/': '/en/about/',
    '/blog/': '/en/blog/',
    '/extensor-tendon-injuries/': '/en/blog/extensor-tendon-injuries/',
    '/scaphoid-fractures/': '/en/blog/scaphoid-fractures/',
    '/flexor-tendon-injuries-and-repair/': '/en/blog/flexor-tendon-injuries-and-repair/',
    '/carpal-tunnel-syndrome-doctors-explanation/': '/en/blog/carpal-tunnel-syndrome/',
    '/homepage/contact/': '/en/contact/',

    // Polish content (one existing post)
    '/zespol-ciesni-nadgarstka/': '/pl/blog/zespol-ciesni-nadgarstka/',

    // FEBHS MCQ → subdomain. Per brand spec v1.8 Decision #29/30 the
    // quiz/exam-prep platform lives on learn.drgladysz.com, not on the
    // main domain. Wildcard `/en/learn/[...slug]` redirects can be added
    // here later, but Astro's static-redirect handling treats wildcards
    // as dynamic routes requiring a real Astro page; for now the bare
    // paths cover everything that was ever surfaced.
    '/en/learn': { status: 301, destination: 'https://learn.drgladysz.com' },
    '/pl/nauka': { status: 301, destination: 'https://learn.drgladysz.com' },

    // Common WordPress paths
    '/wp-content/': '/en/',
    '/feed/': '/en/blog/',
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
