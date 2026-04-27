# Code skeleton — drgladysz.com (Astro + Sanity + Vercel)

A pre-configured Astro 6 starter project with Aarau Graphite brand tokens and Sanity CMS wired in. This skeleton gives Claude Code a working baseline so the build doesn't start from zero.

## What's here

```
code-skeleton/
├── package.json            # Astro 6 + Tailwind 4 + Sanity + Preact + MDX
├── astro.config.mjs        # MDX, Preact, Sanity, sitemap, redirects, security headers
├── tailwind.config.ts      # Aarau Graphite tokens wired into Tailwind theme
├── tsconfig.json           # Strict TypeScript with @/* path aliases
├── public/
│   ├── fonts/              # Place IBM Plex woff2 files here
│   └── img/                # Place 20 photography library files (img-01.jpg through img-20.jpg)
└── src/
    ├── layouts/
    │   └── BaseLayout.astro # Root layout with i18n, hreflang, schema.org slot, Plausible
    ├── components/         # Empty — Claude Code creates components here
    ├── pages/              # Empty — Claude Code creates routes here
    ├── content/            # Empty — for migrated WordPress MDX
    ├── lib/                # Empty — for Sanity client, citation pipeline, schema generators
    ├── assets/             # Empty — for build-time-processed assets
    └── styles/
        └── globals.css     # Brand tokens + Tailwind + Plex @font-face
```

## Setup steps for Claude Code

### Phase 0 — Manual prerequisites (the user does these)

Before Claude Code touches the repo, the user (Mateusz) needs to:

1. Sign up for Vercel at vercel.com (free tier; link to GitHub)
2. Sign up for Sanity at sanity.io (free tier; create project named "drgladysz-content")
3. Sign up for Plausible Analytics at plausible.io (€9/mo or free trial)
4. Create a fresh GitHub repository at `github.com/[username]/drgladysz`
5. Decide on email continuity strategy (keep at Zenbox standalone, or migrate to Google Workspace)
6. Download IBM Plex woff2 files from https://github.com/IBM/plex/tree/master/packages
   - Required weights:
     - `IBMPlexSerif-Regular.woff2`
     - `IBMPlexSerif-Italic.woff2`
     - `IBMPlexSerif-Medium.woff2`
     - `IBMPlexSans-Regular.woff2`
     - `IBMPlexSans-Medium.woff2`
     - `IBMPlexSans-SemiBold.woff2`
     - `IBMPlexMono-Regular.woff2`
     - `IBMPlexMono-Medium.woff2`
   - Place in `public/fonts/`
7. Place 20 photography files (img-01.jpg through img-20.jpg) in `public/img/`

### Phase 1 — Project initialisation (Claude Code, ~30 min)

```bash
cd code-skeleton/
npm install
```

### Phase 2 — Sanity Studio embed (Claude Code, ~1 hour)

1. Initialise Sanity project from inside the repo:
   ```bash
   npx sanity@latest init --bare
   # When prompted, use existing project (the one created in Phase 0)
   # Use "production" dataset
   # Output schemas to ./studio
   ```

2. Move generated `sanity.config.ts` to repo root if it ended up elsewhere

3. Create `studio/schemas/` directory and add schemas as documented in `sanity-schemas/README.md`

4. Configure embedded studio at `/studio` route in `src/pages/studio/[...index].astro`:
   ```astro
   ---
   import { studioPage } from '@sanity/astro';
   ---
   <studioPage client:load />
   ```

### Phase 3 — Verify token wiring (Claude Code, ~15 min)

Create temporary route at `src/pages/test.astro`:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="Test page" description="Token verification">
  <div class="bg-bg p-s10">
    <h1 class="font-serif text-display">Mateusz Gładysz</h1>
    <p class="font-mono text-caption tracking-credentials text-accent">
      MD · FEBOPRAS · FEBHS
    </p>
    <p class="font-serif italic text-body-lg text-ink-2 max-w-narrow">
      Surgical care for the hand and reconstructive microsurgery.
    </p>
  </div>
</BaseLayout>
```

Run `npm run dev` and visit http://localhost:4321/test. Verify:
- Cream background (#FAF7F2)
- Plex Serif Medium 64px headline (lowercase except M and G)
- Plex Mono caps in oxblood
- Italic Plex Serif body in dark grey
- Plausible analytics initializing in browser console

If everything renders correctly, delete the test route before committing.

### Phase 4 — Build the actual site

The site structure is documented in `technical/stack-and-architecture.md`. Follow the build sequence in the master `README.md` of the package. Key milestones:

1. Layout components (SiteNav, SiteFooter, PageContainer, SectionMasthead)
2. Home page (consume `content/home-en.md`, match `drgladysz-home-page-v1.6.html` mockup)
3. About page (consume `content/about-en.md`, match `drgladysz-about-page-v1.6.html` mockup)
4. Schema.org generators in `src/lib/schema.ts`
5. Sanity content infrastructure (article schema, GROQ queries, blog index/detail pages)
6. WordPress blog post migration (7 posts as MDX in `src/content/blog/`)
7. Procedure schema and templates (Feature 2 from `features/02-procedure-schema.md`)
8. Tier 1 features: Citation system (Feature 1) ready for first article
9. Tier 2 features ship in months 1-12 post-launch (Calculators, MCQ, Glossary)

## Important constraints

1. **Do not introduce design tokens not in `brand-tokens.json`.** No bespoke colours, no new font weights, no spacing values outside the 8pt scale.

2. **Do not introduce forbidden components.** See `technical/compliance-checklist.md`. No testimonials, no carousels, no chat widgets, no tracking pixels.

3. **Polish content is independently composed.** Do not auto-translate any English content into Polish. Polish is a separate composition session.

4. **MCNZ abbreviation expansion at first appearance.** First mention of FEBOPRAS, FEBHS, MD on each page must be expanded.

5. **Performance budgets are hard.** LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms. Run Lighthouse before any deploy. Astro should hit these by default if you respect island hydration boundaries (`client:visible`, `client:idle`).

6. **No JavaScript on content-heavy pages by default.** Only interactive features (calculators, MCQs, citation popovers) ship JS, and only via Astro Islands.

## What this skeleton does NOT include

- **Page components** — Claude Code builds these from the content files and visual mockups
- **Schema.org generators** — Claude Code writes these in `src/lib/schema.ts`
- **MDX content files** — Blog post migration from WordPress is a separate task
- **Polish content** — Pending Polish composition session
- **Sanity Studio schemas** — Documented in `sanity-schemas/README.md`; Claude Code creates the actual `.ts` files in `studio/schemas/`

## Reference files in parent package

- `content/home-en.md` — home page locked content with structured frontmatter
- `content/about-en.md` — about page locked content
- `content/footer-en.md` — footer locked content
- `content/meta-and-seo.md` — SEO + schema.org spec
- `design/brand-tokens.json` — design tokens, primary source of truth
- `design/photo-manifest.md` — photo placement reference
- `technical/stack-and-architecture.md` — full technical spec
- `technical/routing-and-redirects.md` — URL conventions and redirect map
- `technical/compliance-checklist.md` — pre-launch compliance QA
- `features/01-citation-system.md` through `features/05-glossary-system.md` — five interactive feature implementation specs
- `sanity-schemas/README.md` — consolidated schema reference
- `drgladysz-brand-book-v1.7.html` — full brand book (separate file, in conversation outputs)
- `drgladysz-brand-spec-for-claude-design-v1.7.md` — full markdown brand spec

## Environment variables

Create `.env.local` in the repo root:

```env
PUBLIC_SITE_URL=https://drgladysz.com
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=your-read-token
PUBLIC_PLAUSIBLE_DOMAIN=drgladysz.com
RESEND_API_KEY=re_your_key
CONTACT_FORM_TO_EMAIL=mateusz@drgladysz.com
```

For dev, you can omit Resend and use a console.log fallback in the contact form API route.
