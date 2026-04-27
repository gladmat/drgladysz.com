---
status: locked
version: 1.7
last_updated: April 2026
target_launch: September 2026
stack: Astro 6 + Sanity CMS + Vercel
---

# Stack and architecture (v1.7)

This document specifies the technical stack, hosting, deployment, and architectural decisions for the drgladysz.com MVP build.

> **Stack change history:** v1.5 originally locked Webflow as the build platform. v1.7 supersedes that decision based on the 5-year content trajectory (100+ articles, 30-50 procedure pages, podcast aggregation, top-3 Polish-market SEO ambition) which exceeds Webflow's CMS comfort zone. Astro + Sanity is the cleanest fit for content-platform scale with multi-author readiness and outsourcing-friendly clean handoff.

---

## Stack — locked

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Astro 6+ (Cloudflare-acquired Jan 2026) | Content-first, minimal JS by default (~0-15 KB shipped vs Next.js ~120-180 KB), best-in-class Core Web Vitals, LLM-friendly markup, MDX-native, mainstream framework with growing Polish ecosystem |
| **Language** | TypeScript | Type safety on a content-heavy site prevents drift between content schema and components |
| **Styling** | Tailwind CSS 4 | Atomic utility approach pairs with token-driven design system. Tailwind config consumes `brand-tokens.json` |
| **CMS** | Sanity (hosted) | Schema-driven structured content, multi-author capable, mobile-friendly editor, $0 free tier handles 1-2 years of growth, supports collaborator onboarding without rebuild |
| **Content authoring** | Sanity Portable Text + MDX for legacy posts | New articles in Sanity (collaborator-ready); migrated WordPress posts as MDX (preserve slugs and authoring history) |
| **Search** | Pagefind (static) | Zero JS until invoked, ships at build time, no third-party search service or vendor lock-in |
| **Forms** | Resend transactional email via Astro API route | Email-only contact form; 3k emails/month free tier sufficient for MVP |
| **Analytics** | Plausible (EU-hosted Germany) | Cookie-free, GDPR/PECR compliant by default, no CMP banner required |
| **Hosting** | Vercel (free tier scaling to Pro if needed) | Native Astro deployment, edge network, automatic HTTPS, custom domain with one-click DNS, EU edge primary for GDPR |
| **Domain** | drgladysz.com canonical, drgladysz.pl 301 → /pl/ | Both kept registered at Zenbox.pl; DNS only points at Vercel; domain ownership remains at Zenbox |
| **Email** | mateusz@drgladysz.com | Kept at Zenbox initially (cancel hosting plan, keep email plan ~50-100 PLN/year) or migrate to Google Workspace; independent of website hosting |
| **Font hosting** | Self-hosted woff2 in `/public/fonts/` | GDPR (no font-fetch from foreign CDN), performance (preload), no third-party request |

---

## Repository structure

```
drgladysz/
├── README.md
├── package.json
├── tsconfig.json
├── astro.config.mjs
├── tailwind.config.ts
├── sanity.config.ts                # Sanity Studio config (embedded in /studio route)
├── public/
│   ├── fonts/                      # Self-hosted Plex woff2 files
│   ├── img/                        # Photography library (20 photos)
│   │   ├── img-01.jpg
│   │   ├── ...
│   │   └── img-20.jpg
│   ├── og/                         # OpenGraph images (1200×630, generated at build)
│   ├── favicon.ico
│   └── apple-touch-icon.png
├── src/
│   ├── content/
│   │   ├── config.ts               # Astro Content Collections schema for legacy MDX
│   │   └── blog/                   # 7 migrated WordPress posts as MDX
│   │       ├── carpal-tunnel-syndrome.mdx
│   │       ├── scaphoid-fractures.mdx
│   │       └── ...
│   ├── layouts/
│   │   ├── BaseLayout.astro        # Root layout with i18n routing
│   │   ├── ArticleLayout.astro     # Article + procedure page layout
│   │   └── PageLayout.astro        # Marketing page layout (home, about, etc.)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SiteNav.astro
│   │   │   ├── SiteFooter.astro
│   │   │   ├── PageContainer.astro
│   │   │   └── SectionMasthead.astro
│   │   ├── home/
│   │   │   ├── HomeHero.astro
│   │   │   ├── Standfirst.astro
│   │   │   ├── SpecialtyBlocks.astro
│   │   │   ├── PublicationsTeaser.astro
│   │   │   └── ArticlesTeaser.astro
│   │   ├── about/
│   │   │   ├── AboutHero.astro
│   │   │   ├── OpeningNarrative.astro
│   │   │   ├── AboutSection.astro
│   │   │   └── PhotoBreak.astro
│   │   ├── content/                # Tier 1 + Tier 2 interactive features
│   │   │   ├── Citation.astro      # Inline citation with sidenote/popover
│   │   │   ├── Bibliography.astro  # End-of-article references
│   │   │   ├── GlossaryTerm.astro  # Dashed-underline tooltip
│   │   │   ├── ProcedureSchema.astro  # AO-Surgery-Reference structured procedure
│   │   │   └── KeyPoints.astro     # JAMA-style key points box
│   │   ├── interactive/            # Preact islands (Tier 2)
│   │   │   ├── QuickDASH.tsx       # Calculator (one of priority five)
│   │   │   ├── PRWE.tsx
│   │   │   ├── BostonCTS.tsx
│   │   │   ├── MCQQuestion.tsx     # FEBHS MCQ component
│   │   │   └── MCQProgress.tsx
│   │   └── ui/
│   │       ├── Button.astro
│   │       ├── Card.astro
│   │       └── ReadMoreLink.astro
│   ├── pages/
│   │   ├── index.astro             # Locale-detect redirect
│   │   ├── en/
│   │   │   ├── index.astro         # Home /en/
│   │   │   ├── about.astro
│   │   │   ├── procedures/
│   │   │   │   ├── index.astro
│   │   │   │   ├── hand-surgery.astro
│   │   │   │   ├── reconstructive-microsurgery.astro
│   │   │   │   ├── skin-cancer.astro
│   │   │   │   └── [slug].astro
│   │   │   ├── publications.astro
│   │   │   ├── contact.astro
│   │   │   ├── credentials.astro
│   │   │   ├── calculators/
│   │   │   │   ├── index.astro
│   │   │   │   └── [slug].astro
│   │   │   ├── glossary/
│   │   │   │   ├── index.astro
│   │   │   │   └── [slug].astro
│   │   │   ├── learn/              # FEBHS prep
│   │   │   │   ├── index.astro
│   │   │   │   └── progress.astro
│   │   │   ├── imprint.astro
│   │   │   ├── privacy.astro
│   │   │   ├── disclaimer.astro
│   │   │   └── blog/
│   │   │       ├── index.astro
│   │   │       └── [slug].astro
│   │   ├── pl/                     # Mirror structure with Polish slugs
│   │   │   ├── index.astro
│   │   │   ├── o-mnie.astro
│   │   │   └── ...
│   │   └── api/
│   │       └── contact.ts          # Resend integration for contact form
│   ├── lib/
│   │   ├── i18n.ts                 # Locale handling, hreflang generation
│   │   ├── schema.ts               # Schema.org JSON-LD generators
│   │   ├── citations.ts            # citation-js Vancouver CSL pipeline
│   │   ├── sanity.ts               # Sanity client + GROQ queries
│   │   └── seo.ts                  # Per-page meta generation
│   └── styles/
│       └── globals.css             # Tailwind directives + brand-tokens.css
├── studio/                         # Sanity Studio (embedded; runs at /studio)
│   ├── schemas/
│   │   ├── article.ts
│   │   ├── procedurePage.ts
│   │   ├── reference.ts            # Citation source documents
│   │   ├── glossaryTerm.ts
│   │   ├── mcqQuestion.ts
│   │   ├── podcastEpisode.ts
│   │   ├── author.ts
│   │   └── index.ts
│   └── desk-structure.ts
└── .env.local.example
```

---

## i18n routing

Astro App Router with explicit `/en/` and `/pl/` directory structure. Each route group has parallel pages.

### URL conventions (locked)

| EN URL | PL URL |
|---|---|
| `/en/` | `/pl/` |
| `/en/about` | `/pl/o-mnie` |
| `/en/procedures` | `/pl/zabiegi` |
| `/en/procedures/hand-surgery` | `/pl/zabiegi/chirurgia-reki` |
| `/en/procedures/reconstructive-microsurgery` | `/pl/zabiegi/mikrochirurgia-rekonstrukcyjna` |
| `/en/procedures/skin-cancer` | `/pl/zabiegi/nowotwory-skory` |
| `/en/publications` | `/pl/publikacje` |
| `/en/contact` | `/pl/kontakt` |
| `/en/credentials` | `/pl/uprawnienia` |
| `/en/calculators` | `/pl/kalkulatory` |
| `/en/glossary` | `/pl/slownik` |
| `/en/learn` | `/pl/nauka` (post-MVP if Polish content available) |
| `/en/imprint` | `/pl/nota-prawna` |
| `/en/privacy` | `/pl/polityka-prywatnosci` |
| `/en/disclaimer` | `/pl/zastrzezenie-medyczne` |
| `/en/blog` | `/pl/blog` |

### Default locale routing

Root `/` → 302 redirect to `/en/` based on `Accept-Language` header (Polish browser → `/pl/`, otherwise `/en/`). Final canonical URLs are always locale-prefixed for unambiguous indexing.

### Hreflang tags (every page)

```html
<link rel="alternate" hreflang="en-NZ" href="https://drgladysz.com/en/about" />
<link rel="alternate" hreflang="pl-PL" href="https://drgladysz.com/pl/o-mnie" />
<link rel="alternate" hreflang="x-default" href="https://drgladysz.com/en/about" />
```

---

## Build and deployment

### Local development

```bash
npm install
npm run dev            # localhost:4321 (Astro default)
```

### Sanity Studio (content authoring)

The Sanity Studio runs embedded at `/studio` route on the production site, secured with Sanity authentication.

```bash
npm run dev            # Astro + Studio both available
# Visit http://localhost:4321/studio in dev to author content
```

### Production build

```bash
npm run build          # Astro generates static + dynamic
npm run preview        # Local production preview
```

### Deployment to Vercel

```bash
# First-time: link repo to Vercel via dashboard
vercel link
vercel --prod          # Deploy to production
```

Auto-deployment on every push to main branch via GitHub integration.

### Environment variables

```env
# .env.local
PUBLIC_SITE_URL=https://drgladysz.com
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=...
PUBLIC_PLAUSIBLE_DOMAIN=drgladysz.com
RESEND_API_KEY=re_...
CONTACT_FORM_TO_EMAIL=mateusz@drgladysz.com
```

---

## Domain and DNS

### Primary domain
`drgladysz.com` — canonical. All content lives here.

### Secondary domain
`drgladysz.pl` — redirects 301 to `https://drgladysz.com/pl/`.

### DNS records (at Zenbox.pl)

For `drgladysz.com` (Vercel hosting):

```
A     @           76.76.21.21
CNAME www         cname.vercel-dns.com
TXT   @           v=spf1 include:_spf.google.com ~all
TXT   @           [DKIM record from email provider — Zenbox or Google]
MX    @           [Email provider MX records — Zenbox or Google]
```

For `drgladysz.pl`:

```
URL Redirect     drgladysz.pl    → https://drgladysz.com/pl/  (301)
URL Redirect     www.drgladysz.pl → https://drgladysz.com/pl/
```

### Email continuity at cutover

Two paths, choose one:

**Option A — Keep email at Zenbox.** Cancel the hosting plan but keep the email plan as a standalone product (~50-100 PLN/year per mailbox). DNS MX records continue pointing at Zenbox. Zero email disruption during cutover.

**Option B — Migrate email to Google Workspace.** ~$7-12/user/month. Better deliverability, more storage, cleaner separation. Migration project of its own; do BEFORE the website cutover, not during.

I'd recommend Option A for the cutover (keep email at Zenbox), then evaluate Google Workspace migration as a separate project post-launch if needed.

---

## Migration from existing WordPress site

### 301 redirects (locked)

Map old WordPress URLs to new structure. Implement in `astro.config.mjs`:

```javascript
export default defineConfig({
  redirects: {
    '/about/': '/en/about',
    '/blog/': '/en/blog',
    '/extensor-tendon-injuries/': '/en/blog/extensor-tendon-injuries',
    '/scaphoid-fractures/': '/en/blog/scaphoid-fractures',
    '/flexor-tendon-injuries-and-repair/': '/en/blog/flexor-tendon-injuries-and-repair',
    '/carpal-tunnel-syndrome-doctors-explanation/': '/en/blog/carpal-tunnel-syndrome',
    '/zespol-ciesni-nadgarstka/': '/pl/blog/zespol-ciesni-nadgarstka',
    '/homepage/contact/': '/en/contact',
    // 410 Gone for everything else handled in middleware
  }
});
```

For 410 Gone responses on legacy paths, use Astro middleware:

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

const KNOWN_PATHS = new Set([/* all valid paths */]);

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isLegacyPath = url.pathname.match(/\/(20\d{2}|wp-|category|tag)/);
  
  if (isLegacyPath && !KNOWN_PATHS.has(url.pathname)) {
    return new Response('Gone', { status: 410 });
  }
  
  return next();
});
```

### Migration sequence

1. Build Astro site on Vercel preview URL (e.g. `drgladysz-staging.vercel.app`)
2. Migrate 7 blog posts to MDX in `src/content/blog/` (preserve slugs)
3. Test 301 redirects on staging
4. Set up DNS for production at Zenbox (point at Vercel)
5. Deploy production. WordPress site remains live during this step
6. Cut over: change DNS A/CNAME to Vercel
7. Wait ~24h for DNS propagation, monitor 404s and redirect coverage
8. Decommission WordPress hosting after 30 days (allow indexers to update)

---

## Performance budgets (locked)

| Metric | Target | Threshold |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s on 4G | Hard fail at 4.0s |
| CLS (Cumulative Layout Shift) | ≤ 0.05 | Hard fail at 0.1 |
| INP (Interaction to Next Paint) | ≤ 200ms | Hard fail at 500ms |
| Total page weight (home) | ≤ 1.5 MB | Hard fail at 2.5 MB |
| Total page weight (procedure) | ≤ 1.0 MB | Hard fail at 2.0 MB |
| Total page weight (article) | ≤ 1.5 MB | Hard fail at 2.5 MB |
| HTTP requests (home) | ≤ 30 | Hard fail at 50 |
| JavaScript shipped per page | ≤ 15 KB by default | Interactive features hydrate per-component |

### Optimisation built-in to Astro

- **Images:** `astro:assets` with automatic format negotiation (WebP/AVIF), responsive `srcset`, lazy loading below fold
- **Fonts:** Self-hosted woff2, `font-display: swap`, preload critical weights via layout `<head>`
- **CSS:** Critical CSS inlined per-component, non-critical deferred
- **JS:** Astro Islands Architecture — interactive components (`client:visible`, `client:idle`) hydrate per-island only
- **No tracking pixels**, no third-party widgets, no chat widgets, no embedded social media widgets

---

## Browser support

- Chrome / Edge (last 2 major versions)
- Firefox (last 2 major versions)
- Safari (last 2 major versions, including iOS Safari)
- Mobile browsers: Chrome Mobile, Safari Mobile

Older browser graceful degradation: typography and layout remain readable; native Popover API has 95%+ support as of April 2026 (Baseline Widely Available since April 2025). For older Firefox or pre-2024 Safari, popovers fall back to inline expansion.

---

## Accessibility requirements

- WCAG 2.1 AA minimum (verified by automated test + manual audit)
- AAA contrast for body text on cream (already verified in palette)
- Visible focus state on all interactive elements (oxblood ring, 2px offset)
- Landmark structure: `<header>`, `<nav>`, `<main>`, `<footer>`
- Alt text on every image (see `design/photo-manifest.md`)
- Polish content within English pages marked with `<span lang="pl">`
- Keyboard navigable
- Screen reader tested (NVDA + VoiceOver)

---

## Security

- HTTPS enforced (Vercel automatic)
- HSTS headers
- Content Security Policy (strict, no inline scripts unless nonce-attributed)
- No client-side state for authenticated content (none exists at MVP)
- Contact form: rate limit + simple spam mitigation (honeypot field, server-side validation)
- No PII storage in browser; contact form submissions go to email immediately

---

## Cost projections

| Service | Tier | Monthly cost |
|---|---|---|
| Vercel | Hobby (free) → Pro ($20/mo if needed) | $0–20 |
| Sanity | Free tier (3 users, 500K API/mo, 10GB assets) | $0 |
| Domain drgladysz.com (Zenbox, kept) | ~PLN 50/year amortised | ~$1 |
| Domain drgladysz.pl (Zenbox, kept) | ~PLN 50/year amortised | ~$1 |
| Plausible Analytics | Cloud (€9/mo) | €9 |
| Email (Zenbox standalone or Google Workspace) | varies | $0–7 |
| Resend | Free tier 3k/mo | $0 |
| **Total estimated** | | **€10–€40/mo** |

Free tier covers the first 1-2 years comfortably. Sanity moves to paid tier (~$99/mo) when you exceed 3 users, 500K API requests, or 10GB asset storage. Realistically that's late year 2 or year 3.
