# drgladysz.com — website build package v1.7

**Owner:** Mateusz Gładysz, MD, FEBOPRAS, FEBHS — Consultant Plastic and Hand Surgeon
**Domain:** drgladysz.com
**Brand spec version:** 1.7 (April 2026)
**Target launch:** September 2026
**Stack:** Astro 6 + Sanity CMS + Vercel + Tailwind CSS 4 + TypeScript

---

## What this package is

Everything needed to build the production drgladysz.com website. The package is structured for use by **Claude Code** as the primary build pipeline, with the brand spec markdown and HTML brand book as the visual reference.

---

## Package structure

```
drgladysz-website-package-v1.7/
├── README.md                                ← This file
│
├── content/                                 ← Page content (locked at v1.6)
│   ├── home-en.md                          Home page locked content
│   ├── about-en.md                         About page locked content
│   ├── footer-en.md                        Footer locked content
│   └── meta-and-seo.md                     Schema.org JSON-LD + per-page meta
│
├── design/                                  ← Visual system (locked at v1.5)
│   ├── brand-tokens.json                   DTCG W3C JSON, source of truth
│   ├── brand-tokens.css                    CSS custom properties version
│   └── photo-manifest.md                   Photo placements + treatment
│
├── technical/                               ← Build specs (updated to v1.7 stack)
│   ├── stack-and-architecture.md           Astro stack, repo structure, deployment, DNS
│   ├── routing-and-redirects.md            i18n routing, 301 redirects, hreflang
│   └── compliance-checklist.md             Pre-launch compliance QA
│
├── features/                                ← v1.7 NEW: five interactive features
│   ├── 01-citation-system.md               Tier 1 — Vancouver/AMA citations with Tufte sidenotes
│   ├── 02-procedure-schema.md              Tier 1 — AO Surgery Reference structured procedures
│   ├── 03-calculator-suite.md              Tier 2 — QuickDASH, PRWE, Boston CTS, MHQ, Mayo Wrist
│   ├── 04-febhs-mcq.md                     Tier 2 — FEBHS exam-prep MCQ component
│   └── 05-glossary-system.md               Tier 2 — Glossary with dashed-underline tooltips
│
├── sanity-schemas/                          ← v1.7 NEW: Sanity Studio schemas
│   └── README.md                            Consolidated reference for all schemas
│
└── code-skeleton/                           ← v1.7 NEW: Astro project starter
    ├── README.md                            Setup instructions for Claude Code
    ├── package.json                         Astro 6 + Sanity + Tailwind 4 dependencies
    ├── astro.config.mjs                     i18n routing, redirects, integrations
    ├── tailwind.config.ts                   Brand tokens wired to Tailwind
    ├── tsconfig.json                        Strict TypeScript
    └── src/
        ├── layouts/BaseLayout.astro         Root layout
        └── styles/globals.css               Plex fonts + brand tokens + base styles
```

---

## How to use this package

### If you are Claude Code (build pipeline)

1. **Read `code-skeleton/README.md` first.** It walks through manual setup (Sanity account, Vercel, Plausible, Plex font download).
2. **Read `technical/stack-and-architecture.md`** for the full technical spec.
3. **Read `technical/routing-and-redirects.md`** for URL structure and 301 map from WordPress.
4. **Read `technical/compliance-checklist.md`** before designing any patient-facing component. Forbidden patterns are non-negotiable.
5. **Reference `design/brand-tokens.json`** for the design system. Tailwind config in skeleton already consumes these.
6. **Reference `content/*.md`** for page content. Do not paraphrase; the wording is locked.
7. **Reference `features/*.md`** when building each interactive feature. Each spec is self-contained with full schema, component code, and effort estimate.
8. **Reference `sanity-schemas/README.md`** for the consolidated schema definitions.
9. **Cross-reference the rendered HTML mockups** (`drgladysz-home-page-v1.6.html`, `drgladysz-about-page-v1.6.html`) and the **HTML brand book v1.7** for visual targets.

### If you are continuing content authoring in a Claude project

The locked Home and About content is in `content/home-en.md` and `content/about-en.md`. Ongoing content authoring (procedure pages, blog posts, glossary entries, MCQ questions) should:

1. Reference the brand voice rules in **brand spec v1.7 §8 Voice & content patterns**
2. Apply the editorial rules in **§11 Locked content: Home page** and **§12 Locked content: About page** (the supervisor naming pattern, italics convention, no-pre-announce rule)
3. Use the procedure schema (Sanity `procedurePage` document) for any new procedure page — the schema enforces structure
4. Use the citation system (Sanity `reference` document) for any peer-audience article
5. Use the glossary (Sanity `glossaryTerm` document) for any patient-audience article that uses medical terminology

---

## Locked decisions (35 total at v1.7)

These should not be re-litigated unless new evidence emerges. Quick reference (full log in brand spec §9):

**v1.5 baseline (12):** unified personal brand, drgladysz.com canonical, Aarau Graphite palette, IBM Plex typography, master + cover-spread wordmarks, no testimonials/carousels/logo soup/tagline, photography hierarchy, WordPress kill, no patient images at MVP, MCNZ + KEL + RODO compliance baseline.

**v1.6 amendments (13):** Polish independent composition (not translation), Polish neutral institutional voice, no NZ-Poland transition pre-announcement, About-page editorial rule (every sentence describes Mateusz), three sub-specialty home blocks, sixth procedure (Skin Cancer Reconstruction), footer credentials at MVP, society memberships at MVP, no phone/address in footer, ORCID + LinkedIn social only, glossary handling, legal pages drafting approach, Symani workstream dormant.

**v1.7 amendments (8):** Stack overrides Webflow lock (Astro + Sanity + Vercel), five locked interactive features, 5-year content trajectory acknowledged, LMS deferred to subdomain, brand book canonical for non-website applications, Polish-language SEO ambition, AI/LLM surfacing as positioning goal, multi-author readiness via Sanity.

---

## What's pending content authoring before launch

Items not yet drafted but needed for September 2026 launch:

- 6 procedure detail pages (Carpal Tunnel, Scaphoid, Flexor, Extensor, Reconstructive Microsurgery overview, Skin Cancer Reconstruction overview)
- 3 procedure category landing pages (Hand Surgery, Reconstructive & Microsurgery, Skin Cancer Surgery)
- /contact page operational content
- /credentials page glossary content
- /imprint, /privacy, /disclaimer (best-effort drafts pre-lawyer-review)
- Polish home page (native composition session)
- Polish About page (native composition session)
- Polish procedure pages and blog posts

Build can begin in parallel with content authoring — Claude Code starts on layout, components, and locked Home/About content while content authoring continues for the rest.

---

## Build sequence (recommended)

1. **Phase 0 — Pre-build setup** (you, ~2 hours): accounts (Sanity, Vercel, Plausible, Resend), GitHub repo, Plex font download
2. **Phase 1 — Project scaffolding** (Claude Code, ~2-3 hours): npm install, verify token wiring, set up Sanity Studio
3. **Phase 2 — Layout components** (~3-4 hours): SiteNav, SiteFooter, PageContainer, SectionMasthead, PhotoBreak
4. **Phase 3 — Home page** (~3-4 hours): from `content/home-en.md` + mockup
5. **Phase 4 — About page** (~3-4 hours): from `content/about-en.md` + mockup
6. **Phase 5 — Tier 1 features** (~24-36 hours): Citation system + Procedure schema (features 01 + 02)
7. **Phase 6 — Content infrastructure** (~2-3 hours): blog index/template, MDX migration of 7 WP posts
8. **Phase 7 — Procedure pages** (~3-4 hours infrastructure + content authoring sessions): templates ready, content authored separately
9. **Phase 8 — Supporting pages** (~3-4 hours): /contact, /credentials, /imprint, /privacy, /disclaimer
10. **Phase 9 — Pre-launch QA** (~2-3 hours): compliance checklist run-through, performance audit, accessibility audit
11. **Phase 10 — Production cutover** (~30 min + 24h monitoring): DNS change at Zenbox, monitor 404s, decommission WordPress after 30 days

**Tier 2 features ship post-launch in months 1-12** — calculators (~25-40h), MCQ (~20-30h), glossary (~15-25h). Build incrementally as content earns them.

---

## Reference materials (separate files, not in this package)

- `drgladysz-brand-spec-for-claude-design-v1.7.md` — full brand specification markdown
- `drgladysz-brand-book-v1.7.html` — full brand book HTML (4 MB, all 20 photos embedded, for visual reference and non-website applications)
- `drgladysz-home-page-v1.6.html` — home page rendered mockup (visual target for Phase 3)
- `drgladysz-about-page-v1.6.html` — about page rendered mockup (visual target for Phase 4)

These are delivered separately. The package above is the build spec; the brand book is the visual reference.

---

## Cost projections at MVP launch

- Vercel Hobby tier: $0
- Sanity free tier: $0 (covers 1-2 years)
- Plausible Cloud: €9/month
- Domain (Zenbox, kept): ~PLN 50-100/year
- Email (Zenbox standalone or Google Workspace): PLN 100-300/year or $7-12/month
- Resend free tier: $0

**Total: ~€10-40/month** during MVP through year 2.

---

## Contact

For questions about this package or the build pipeline:

**Mateusz Gładysz**
mateusz@drgladysz.com
ORCID: [0009-0009-2380-4056](https://orcid.org/0009-0009-2380-4056)

---

## Version history

- **v1.7 (April 2026)** — Astro + Sanity stack lock, five interactive features, 5-year content trajectory acknowledged, brand cohesion guidance for non-website applications
- **v1.6 (April 2026)** — Locked Home and About content, Polish independent composition principle, NZ-Poland transition rule
- **v1.5 (April 2026)** — Cover-spread display variant locked, Webflow stack baseline (superseded by v1.7)
- **v1.0–v1.4 (April 2026)** — Initial brand research and specification drafts
