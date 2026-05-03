# drgladysz.com — Claude Code project notes

Personal-brand-and-content website for **Mateusz Gładysz, MD, FEBOPRAS, FEBHS** — Consultant Plastic and Hand Surgeon. Target launch September 2026. Stack: **Astro 6 + Sanity 4 + Tailwind 4 + Vercel**, TypeScript strict, Preact for islands.

---

## Repo layout

```
site/
├── _handoff/                          ← LOCKED build spec — READ FIRST for any
│   ├── README.md                       brand/content/feature work
│   ├── content/                        Locked Home, About, Footer copy (do not paraphrase)
│   ├── design/                         brand-tokens.json, photo-manifest.md
│   ├── features/                       5 interactive feature specs (citations, procedures, calculators, MCQ, glossary)
│   ├── sanity-schemas/                 Consolidated schema reference
│   └── technical/                      Stack, routing/redirects, compliance checklist
├── src/
│   ├── assets/img/                    20-photo brand library — img-NN.jpg (NOT in public/)
│   ├── components/                    PageContainer, SiteNav, SiteFooter, SectionMasthead, PhotoBreak,
│   │                                  HomeHero, AboutHero, Standfirst, SpecialtyBlocks,
│   │                                  PublicationsTeaser, ArticlesTeaser, AboutSection
│   ├── layouts/                       BaseLayout (head/meta/preload), SiteLayout (wraps + slots nav/footer)
│   ├── lib/                           images.ts (manifest reference), image-config.ts (shared pipeline constants)
│   └── pages/en/                      English routes — index.astro (Home), about.astro
│                                       Polish routes (pages/pl/) pending native composition session
├── studio/schemas/                    Sanity schemas — most are stubs until their build phase
├── astro.config.mjs                   Astro config — i18n, redirects, sitemap, Tailwind via Vite plugin
├── tailwind.config.ts                 JS config holding Aarau Graphite tokens (loaded via @config in globals.css)
├── sanity.config.ts                   Studio config (standalone, runs via `npm run studio:dev`)
└── .env.local                         (gitignored) Sanity project ID + tokens, Plausible domain, etc.
```

`_handoff/content/*.md` is **locked at v1.6.2** (April 2026), aligned with brand spec **v1.8**. Do not paraphrase the wording. Canonical brand spec lives at `01-brand-system/drgladysz-brand-spec-for-claude-design-v1.8.md` (parent of `site/`); the canonical single-doc locked content lives at `01-brand-system/drgladysz-locked-content-home-and-about-v1.6.2.md`. The `_handoff/content/` files mirror the canonical with build-friendly per-page YAML frontmatter.

---

## Build phase status

| # | Phase | Status | Commit |
|---|---|---|---|
| 0 | Pre-build setup (accounts, fonts, photos) | ✅ done | n/a |
| 1 | Project scaffolding (npm install, Sanity schemas, env wiring) | ✅ done | `5abee72` |
| 2 | Layout components (PageContainer/SiteNav/SiteFooter/SectionMasthead/PhotoBreak) + state-of-the-art image pipeline | ✅ done | `fd4c58d` |
| 3 | Home page composition (from `_handoff/content/home-en.md` + `02-mockups/drgladysz-home-page-v1.6.html`) | ✅ done | `4ec21ee` |
| 4 | About page (from `_handoff/content/about-en.md` + about mockup) | ✅ done | `ab4b5a3` |
| 5 | Tier 1 features — Citation system + Procedure schema | ✅ done | (uncommitted) |
| 6 | Content infrastructure — blog index | ✅ done | (uncommitted) |
| 7 | Procedure pages — index + category anchors | ✅ done (infra) | (uncommitted) |
| 8 | Supporting pages (/contact, /credentials, /imprint, /privacy, /disclaimer, /publications) | ✅ done | (uncommitted) |
| 9 | **Pre-launch QA (compliance, perf, a11y)** | **⬜ NEXT** | — |
| 10 | Production cutover (DNS at Zenbox, monitor 404s, decommission WP after 30 days) | ⬜ | — |

**Phase 6/7/8 deferred work (content authoring, not infrastructure):**
- Phase 6: WordPress migration — **scaphoid-fractures, extensor-tendon-injuries, and flexor-tendon-injuries-and-repair all live as of 2026-04-30** (FESSH-prep, peer audience; cumulative 88 references, 31 glossary terms, JAMA Key Points, italic standfirst, cross-link block at end of each, MedicalScholarlyArticle JSON-LD; no images yet). Still to author: the Polish post (zespol-ciesni-nadgarstka). See "Phase 6 — what shipped" + "Phase 6 update 2026-04-30" sections below.
- Phase 7: 5 more procedure pages — author one per sub-specialty area at minimum (e.g. one reconstructive-microsurgery, one skin-cancer) so each category index isn't empty at launch.
- Phase 8: Polish mirrors of all supporting pages (/pl/kontakt, /pl/uprawnienia, /pl/nota-prawna, /pl/polityka-prywatnosci, /pl/zastrzezenie-medyczne, /pl/publikacje) — pending Polish composition session.
- Phase 8: ~~Resend-backed contact form server endpoint~~ ✅ shipped 2026-05-02 alongside contact-page v1.0 lock. `/api/contact.ts` runs on Vercel SSR (`prerender = false`); rest of the site stays static. Form sends to `office@drgladysz.com` (env `CONTACT_FORM_TO_EMAIL`); rate-limit 5/hour/IP; honeypot; required Subject + Privacy-consent fields. See "Phase 8 update 2026-05-02" below.

Tier 2 features (calculators, MCQ, glossary) ship **post-launch** in months 1-12.

---

## Critical conventions and Astro 6 gotchas

These are non-obvious things prior sessions tripped on. Do not redo:

- **`output: 'static'`** — Astro 6 removed `'hybrid'`. Default `'static'` now does the same thing (per-page opt-in to SSR via `export const prerender = false`).
- **i18n routing is strict.** `prefixDefaultLocale: true` means top-level pages 404. All routes must live under `src/pages/en/` or `src/pages/pl/`.
- **Tailwind 4 ships as a Vite plugin**, not an Astro integration. `@astrojs/tailwind` is unmaintained for v6. Config: `import tailwindcss from '@tailwindcss/vite'` in astro.config + `@import "tailwindcss"` and `@config "../../tailwind.config.ts"` in `src/styles/globals.css`.
- **Vite pinned to ^7** via `overrides` in package.json — Astro 6 requires it; npm pulls Vite 8 transitively without the pin.
- **`getImage()` takes `format` (singular).** `<Picture>` takes `formats` (plural). Easy to confuse — they look like the same prop.
- **Image pipeline**: photos in `src/assets/img/`, NOT `public/img/`. Astro only optimizes images imported from `src/`.
- **Image registry is per-page direct imports.** Lazy globs (`import.meta.glob` without `eager`) and dynamic-import switch statements both make Vite emit every glob target as a static asset, even unreached ones. The only thing that tree-shakes properly is direct per-page `import img12 from '@/assets/img/img-12.jpg'`.
- **LCP preload uses shared config.** `src/lib/image-config.ts` holds widths + quality + sizes constants. Both `<Picture>` (in PhotoBreak) and `getImage()` (in BaseLayout's `heroPreload`) must use identical options or the preloaded URL hashes diverge from what the picture element resolves and the browser fetches twice.
- **Astro dev-server CSS cache goes stale on structural refactors.** When a component's grid/layout CSS changes, Vite HMR sometimes serves the OLD compiled CSS even after a hard browser reload. The production build (`npm run build`) is correct; only dev is wrong. Symptom: `getComputedStyle(el).display` returns `block` when CSS says `grid`. Fix: `pkill -f "astro dev"` then `cd site && npm run dev` for a clean restart. Already cost two debug rounds in this session — restart pre-emptively after any AboutSection/Standfirst/grid-template refactor before judging visuals.
- **Astro scoped CSS doesn't reach slot content.** Component templates render with a `data-astro-cid-XXX` attribute; slot content from the parent does NOT get that attribute. So `<style>` rules inside the component only match elements rendered in the component's own template. To style slot content from the parent, use `:global(...)` selectors. Both Standfirst's `.aside-num`/`.aside-list` and AboutSection's equivalents are styled via `:global()` for that reason.
- **Readonly arrays don't cross into `<Picture>` props.** `IMAGE_WIDTHS` and `IMAGE_FORMATS` in `src/lib/image-config.ts` are `as const` (good for narrow typing), but `<Picture>` typings expect mutable arrays. At every call site spread them: `widths={[...IMAGE_WIDTHS]}`, `formats={[...IMAGE_FORMATS]}`. Forgetting this is a type error at build time, not runtime.
- **Article package YAML quirks.** Glossary root key is sometimes `glossaryTerms` (camelCase, scaphoid + flexor) and sometimes `glossary_terms` (snake, extensor); references `authors` is sometimes a block list and sometimes a single comma-separated string (flexor). `scripts/import-article.ts` normalises both shapes. Future package authors should expect either.
- **Sanity write token env name.** Local `.env.local` convention is `SANITY_API_DEVELOPER_TOKEN` (read+write); legacy `SANITY_API_WRITE_TOKEN` is also accepted by the seed scripts. Revoke at sanity.io/manage immediately after a seed run (see open item #1).
- **Security hook false-positive on RegExp `.exec` calls.** The PreToolUse Write hook regex-matches the substring `.exec(` and fires on `RegExp.prototype` matching calls thinking they're shell-execution APIs. Use `someString.match(regex)` instead in scripts you're writing — same semantics for our token-pattern matching, no hook trigger.

---

## Sanity

- **Project ID:** `kwp48q91`. Dataset: `production`. Manage at [sanity.io/manage](https://www.sanity.io/manage).
- **Studio runs standalone** via `npm run studio:dev` (port 3333). Not embedded in Astro at `/studio`. The skeleton's "embedded studio" plan needed `@sanity/astro` (not in deps); standalone is simpler. Revisit if/when embedding becomes needed.
- **Schema status:**

| Schema | Status |
|---|---|
| `author` | ✅ full |
| `article` | ✅ full (citation + glossary marks, `standfirst`, `relatedArticles`/`relatedProcedures`) |
| `podcastEpisode` | ✅ full |
| `procedurePage` | ✅ full (Phase 5 — AO Surgery Reference 10-section structure) |
| `bibReference` | ✅ full (Phase 5 — Vancouver/AMA fields, was `reference`) |
| `callout` | ✅ shared object type (info / warning / pearl) |
| `glossaryTerm` | ✅ full (`shortDefinition` cap raised 400→450 on 2026-04-30 to fit medical-precision terms like `bowstringing`) |
| `calculator` | ✅ full (Tier 2 infrastructure built 2026-04-29 — schema, page shells, QuickDASH widget. PRWE/Boston/MHQ/Mayo deferred until validation paper review per calculator) |
| **FESSH MCQ schemas** | ✅ moved to `learn/` sub-app (2026-04-29 evening). The earlier `mcqQuestion` schema was removed entirely — FESSH MCQ uses a different format (5 T/F statements per question, not single-answer multiple-choice). New schemas: `fesshReference`, `fesshMcq`, `fesshStatement`, `fesshMcqMetadata`, `fesshMockExam` — all live here in `studio/schemas/` but consumed by the `learn/` Astro project. See `learn/CLAUDE.md` and `01-brand-system/decisions-v1.10.md`. |

- **Schema rename:** `reference` → `bibReference` because `reference` is reserved by Sanity (collides with the built-in document-reference type). All GROQ queries, schema files, and Studio config use `bibReference`. The user-facing Studio label is still "Reference (citation source)".
- **`useCdn: false`** on the Sanity client (`src/lib/sanity.ts`). Sanity's CDN can serve stale results for a few minutes after a publish, which during builds means a freshly published doc may be invisible to `getStaticPaths` even though it's queryable elsewhere. Build-time freshness > CDN read perf.
- **Schema deploy:** the schema needs to be deployed for the Sanity MCP `get_schema` tool to work and for any deploy-time schema validation. Run `npx sanity@latest schema deploy` from the local Studio after `sanity login`. Skipped this session because deploy needs interactive CLI auth; documents were created via MCP regardless. Studio reads schema from local files, so the editing UI is unaffected.
- Sanity ecosystem at v4 (current); v5 bump deferred — Phase 5 worked cleanly on v4 and bumping is a separate risk.

---

## Locale conventions (i18n)

- **English under `/en/`**, Polish under `/pl/`. Both prefixes always shown — never bare `/about`.
- **Polish content is independently composed** — never machine-translated from English. Awaiting native Polish composition session for Home, About, all procedure pages.
- **Polish slugs** (from brand spec §11): `/pl/o-mnie`, `/pl/zabiegi`, `/pl/publikacje`, `/pl/kontakt`, `/pl/uprawnienia`, `/pl/nota-prawna`, `/pl/polityka-prywatnosci`, `/pl/zastrzezenie-medyczne`.
- **FESSH-prep articles are English-only.** Articles with `category: fessh-prep` (currently scaphoid-fractures, extensor-tendon-injuries, flexor-tendon-injuries-and-repair) never get Polish translations — the FESSH Diploma exam is English-language, so a Polish version has no audience. This matches the `learn.drgladysz.com` MCQ sub-app convention. Other categories (`patient`, `expert`, `news`) follow the standard EN/PL mirror rule.

---

## Brand details encoded in components

- **Wordmark / signature treatment:** `text-transform: lowercase` with `<span class="cap">M</span>` and `<span class="cap">G</span>` to keep the M and G uppercase. **No italic on the surname** in any context (Decision #5 in v1.8 spec, "no italic on the name in any context").
- **Master wordmark vs cover-spread variant** (v1.8 §2): site nav, all page heroes, and any in-running reference use the **master Plex Serif Medium 500**. The cover-spread Regular 400 variant is reserved for brand-book covers, document title pages, slide title slides only.
- **Footer signature** uses Plex Serif **Regular 400** (lighter than the master Medium 500 — a distinctive footer register), `clamp(28px, 3vw, 40px)`, lowercase + cap M/G, never italic.
- **OR-shot color treatment** (img-04, img-09, img-10, img-12): editorial Lightroom grading per v1.8 §3 (saturate teal -15-20%, lift shadows toward warm grey, push midtones toward yellow/red). The current site-wide PhotoBreak `saturate(0.96)` CSS matches the v1.6.2 mockups; per-image Lightroom grading is a Phase 9 finishing pass.
- **Marginal aside / Tufte sidenote pattern** (Standfirst, AboutSection): both components have a 2-column body+aside grid on desktop ≥900px (body left, ~200px mono aside right with 2px oxblood top-rule). The aside is a named `<slot name="aside">` so consumers can pass a marginal index, pulled keywords, structural metadata, or — in Phase 5 — citation references. On mobile, the aside stacks above the body to read as a section preview. Default fallback content is a 24px oxblood accent bar so the column never collapses visually. The home `Standfirst` populates the aside with a mono index of the three sub-specialty section headings ("Hand Surgery", "Reconstructive & Microsurgery", "Skin Cancer Surgery") — reusing locked labels as a marginal preview, not introducing new copy.

---

## Photo manifest quick reference

Full details in `_handoff/design/photo-manifest.md`. Primary tier:

| ID | Placement | Aspect | Notes |
|---|---|---|---|
| `img-12` | Home hero | 4:5 | OR lights, no mask. Saturate 0.96. `HomeHero` component (Phase 3). |
| `img-13` | Canonical headshot — all square crops, social, OG fallback | 1:1 | Close-up, light blue blazer. Don't use as page hero. |
| `img-14` | About hero | 4:3 | Examination room, anatomical posters. |
| `img-19` | About break before research | 4:5 tall | Charcoal blazer, French doors. Max-height 90vh. |
| `img-08` | Section dividers across site | 16:9 | Surgical instrument tray, gold + steel. |
| `img-02` | Home break (specialties → publications) | 16:9 | Gloved hands, instruments. |
| `img-11` | Polish-only sterile-technique pages | 16:9 | Polish text in frame — restrict to `/pl/`. |

---

## Don'ts (forbidden by compliance / brand)

Per `_handoff/technical/compliance-checklist.md` and brand spec — these are non-negotiable:

- No testimonials, no carousels, no chat widgets, no tracking pixels.
- No patient images at MVP (RODO/MCNZ).
- No bespoke colors, font weights, or spacing values outside the locked design tokens.
- **First mention of FEBOPRAS / FEBHS / MD on each page must be expanded.**
- Performance budgets are hard: LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms.
- No JavaScript on content pages by default — only interactive features ship JS, via Astro Islands (`client:visible` / `client:idle`).

---

## MCP servers available

| MCP | Status | Use for |
|---|---|---|
| `astro-docs` (https://mcp.docs.astro.build/mcp) | ✅ connected | Any Astro 6 API question — image pipeline, i18n routing, Content Collections, view transitions, Fonts API, server islands |
| `Sanity` (https://mcp.sanity.io) | 🔐 needs OAuth on next session start | Schema-aware GROQ queries, document patches, release management, content seeding |
| `Vercel` | ⏸ deferred until Phase 10 (cutover) | Runtime + build logs, deployment management |
| `plugin:github:github` | ❌ failing connection | Plugin-managed (not user MCP) — disable via `/plugins` if not used |

---

## External systems

- **GitHub:** [github.com/gladmat/drgladysz.com](https://github.com/gladmat/drgladysz.com) (origin/main).
- **Sanity:** drgladysz-content / production (kwp48q91).
- **Vercel:** linked to GitHub repo (free Hobby tier).
- **Plausible:** drgladysz.com (EU-hosted, cookie-free).
- **Resend:** API key in `RESEND_API_KEY`. Used in Phase 8 for /contact form.
- **Domain registrar:** Zenbox (PL). DNS cutover in Phase 10.

---

## Open items / decisions deferred

1. **Sanity API token rotation.** A read+write token was pasted in chat history during Phase 1 setup (2026-04-28). Rotate it in Sanity → Manage → API → Tokens, replace with a **read-only** token in `.env.local` (frontend doesn't need write). Studio uses session auth, no token. (Phase 5 used the Sanity MCP for seeding instead of the API token.)
2. **OR-shot color grading.** Editorial pass in Lightroom for img-04, 09, 10, 12 vs accepting current CSS `saturate(0.96)` approximation. Defer decision to Phase 9.
3. **Image storage strategy.** Currently 68MB of source photos in git history. Migrate to Sanity asset CDN if git size becomes annoying — schemas already designed for it.
4. **Polish content composition.** Native Polish session pending for Home, About, procedure pages, and `category: patient` / `expert` / `news` blog posts. **FESSH-prep articles are excluded** (English-only by design; see Locale conventions).
5. **Embedded vs standalone Sanity Studio.** Standalone now; revisit if you want `/studio` on drgladysz.com (would add `@sanity/astro` dep).
6. **Dependency major bumps.** Sanity 4→5, Resend 4→6, TypeScript 5→6, Preact Signals 1→2 are available. Phase 5 deferred the v4→v5 bump because the existing v4 worked cleanly with the new schemas; revisit when there's a feature reason to bump (rather than for its own sake).
7. **About hero pull-quote centering.** The §01 opening narrative paragraph is centered within its right-of-§-margin column rather than the full viewport (~52px right of viewport-center at 1440px). User said "looks fine for now"; if the slight off-center bothers anyone later, switch §01 to absolute-positioned in the margin so the narrow paragraph can center against the viewport.
8. **Favicon files.** `/favicon.svg` and `/apple-touch-icon.png` are referenced by BaseLayout but absent from `public/`. Console logs a 404 in dev. MG monogram favicons (16/32/180/192/512) per spec §2 and meta-and-seo.md — outstanding asset task.
9. ~~**Sanity schema not deployed.**~~ ✅ Resolved 2026-04-30 — schema deployed via `npx sanity@latest schema deploy`. Schema document `_.schemas.drgladysz` is live on `production`; deploy-time validators fire correctly. Re-run after any schema-file change.
10. **Citation popover IDs duplicate when same ref cited multiple times in one doc.** `Citation.astro` builds `popoverId = cite-{refId}-{index}`. The bibliography index is per-ref (so the same ref cited twice gets the same number), which means the popover element is rendered twice with the same id — invalid HTML, though browser popover behaviour still works because both `popovertarget` buttons point at the same id. Fix: thread the markDef `_key` (already unique per occurrence) into Citation as a suffix. Low priority; affects the seeded procedure page which cites refs 1, 4, 5 twice each.
11. **`/en/blog` and `/en/procedures` index pages not built.** Phase 5 detail pages link back to these (and the home page links to `/en/blog`); they currently 404. Phase 6 builds the blog index; Phase 7 builds the procedures index.
12. **Article schema `author` field validation will reject seeded test article on a clean publish.** The seeded article references the seeded author UUID via the built-in Sanity reference type — that works. But if you re-seed without the author existing, the publish will fail validation. Author is a required reference. Worth knowing if you delete-and-reimport.

---

## Phase 5 — what shipped (citation system + procedure schema)

Phase 5 delivered the Tier 1 features specified in `_handoff/features/01-citation-system.md` and `02-procedure-schema.md`. Detailed change log in `PHASE-5-NOTES.md` (root of `site/`). Summary:

**Sanity schemas**
- `studio/schemas/bibReference.ts` — full Vancouver field shape (authors, journal, volume, issue, year, pages, PMID, DOI, PMCID, URL, pubType, editors/publisher for books, abstractPreview).
- `studio/schemas/procedurePage.ts` — AO Surgery Reference 10-section structure with required-field discipline (indications/anatomy/approach/keySteps/aftercare/complications/evidence required; contraindications/positioning/closure/patientSummary optional).
- `studio/schemas/callout.ts` — shared `info`/`warning`/`pearl` object type, used inline in both `article.body` and procedure clinical sections.
- `article.ts` citation mark now points at `bibReference` (the type was renamed from `reference` because Sanity reserves that name).

**Frontend**
- `src/lib/sanity.ts` — typed Sanity client + GROQ accessors + `extractCitationOrderFromBlocks()` (recursive walk that builds the per-doc bibliography order, traversing nested callout content too).
- `src/lib/citations.ts` — pure-JS Vancouver/AMA formatter (no `citation-js` runtime — kept the dep installed for future advanced cases). Handles ICMJE 6-author truncation, journal/book/chapter/online/guideline pubTypes, PubMed/DOI/PMC link assembly.
- `src/lib/schema.ts` — JSON-LD generators for `MedicalScholarlyArticle` (peer/expert audience), `MedicalWebPage` (patient audience), `MedicalProcedure`, plus a `BreadcrumbList` helper. Citations populate the `citation` array in JSON-LD.
- `src/components/content/Citation.astro` — superscript marker + `<aside popover="auto">` that floats into the right-gutter as a Tufte sidenote on desktop ≥1024px and behaves as a native HTML Popover on mobile. Zero JS shipped.
- `src/components/content/Bibliography.astro` — numbered Vancouver-formatted reference list at end of article; `id="ref-N"` anchors with sticky-header `scroll-margin-top` and `:target` highlight.
- `src/components/content/KeyPoints.astro` — JAMA-style summary box (Question / Findings (or Indications) / Meaning (or Clinical relevance)).
- `src/components/content/Callout.astro` — info / warning / pearl visual treatments.
- `src/components/content/PortableTextRenderer.astro` — custom Portable Text walker. Handles block styles (h2-h6, blockquote), bullet/number lists, callouts (recurses via `<Astro.self>`), images (Sanity CDN URLs), and the marks tree (em / strong / underline / strike-through / link / **citation** / glossaryTerm passthrough).
- `src/components/content/PortableTextSpan.astro` — span-level mark renderer; decorators stack from inside out, link wraps, citation appends a numbered superscript marker AFTER the span.

**Routes**
- `src/pages/en/blog/[slug].astro` — article detail page; `getStaticPaths` over Sanity articles. Layout reserves a 320px right gutter on desktop ≥1024px so floated citation sidenotes land in the margin without overlapping body. Mobile collapses the gutter and shows citations as native popovers from the inline marker.
- `src/pages/en/procedures/[slug].astro` — procedure detail page with the AO 10-section structure, in-page table of contents, numbered key steps with optional pitfall callouts, optional collapsible "For patients" plain-language summary, end-of-page bibliography.

**Seed content (live in Sanity)**
- 1 author (Mateusz Gładysz)
- 5 references on carpal tunnel syndrome literature: Atroshi 1999 (JAMA), Padua 2016 (Lancet Neurol), Phalen 1966 (JBJS), Louie 2012 (Hand), Vasiliadis 2014 (Cochrane). All have valid PMIDs/DOIs and abstract previews.
- 1 article: `/en/blog/carpal-tunnel-syndrome` (patient audience) — uses 3 of the references inline, demonstrates KeyPoints + pearl callout + 3 citation sidenotes.
- 1 procedure: `/en/procedures/open-carpal-tunnel-release` (peer audience) — full AO 10-section structure with all 5 references distributed, 4 numbered key steps with 2 pitfall callouts, patientSummary populated.

Build status: `npm run type-check` 0 errors, `npm run build` 4 pages (home, about, 1 article, 1 procedure), 105 image variants. The article and procedure HTML render with valid Schema.org JSON-LD (`MedicalWebPage` and `MedicalProcedure` respectively, each with a populated `citation` array).

## Phase 6/7/8 — what shipped (content infra + supporting pages)

The 2026-04-29 overnight session shipped infrastructure for Phases 6, 7, and 8 — a single push because the work was tightly related (index pages and supporting pages all share the same shell). Detailed change log in `PHASE-6-8-NOTES.md`.

**Routes added under `/en/`:**
- `blog/index.astro` — knowledge-base index. Groups articles by category in fixed editorial order (Patient information → Expert blog → FESSH prep → News & commentary). Empty categories suppressed; the page renders gracefully with one article today.
- `procedures/index.astro` — procedures index. Three sub-specialty sections with `id="hand-surgery"`, `id="reconstructive-microsurgery"`, `id="skin-cancer"` anchors so the home page Specialty Blocks now link cleanly into the right section.
- `contact.astro` — email + practice context + a `mailto:`-action form (no Resend server endpoint until Phase 10 adds the Vercel adapter).
- `credentials.astro` — explains MD / Facharzt / FEBOPRAS / FEBHS / MCNZ / PWZ / Swiss GLN with links to the relevant public registers.
- `imprint.astro` / `privacy.astro` / `disclaimer.astro` / `credentials.astro` / `consent.astro` (EN) and `nota-prawna.astro` / `polityka-prywatnosci.astro` / `zastrzezenie-medyczne.astro` / `uprawnienia.astro` / `zgoda.astro` (PL) — **all ten render the locked legal-pages-package** at `01-brand-system/legal-pages-package/`. Each route is a 5-line file that pulls the matching markdown from the `legal` content collection and renders via `LegalPageLayout`. Source markdown lives at `src/content/legal/{en,pl}/*.md` (verbatim copy of the package; do not edit there — update the canonical package and re-copy).
- `publications.astro` — full publications archive grouped by year. Currently 2 entries (JMIR AI 2026 + EBJ 2022); add to `PUBLICATIONS` array to extend.

**Legal pages content pipeline:**
- `src/content.config.ts` — `legal` collection with frontmatter zod schema matching the package's `_meta/manifest.json#frontmatterSchema`.
- `src/plugins/remark-section-masthead.mjs` — remark transform that recognises the locked `§ 0n — Theme` paragraph pattern and marks it with `class="section-masthead"` so the layout CSS renders it in Plex Mono small caps with oxblood accent (per package README "Required render conventions" point 1).
- `src/layouts/LegalPageLayout.astro` — wraps the rendered markdown in `SiteLayout` + `ContentPage`, builds the version + last-updated meta line in the page locale, and provides `:global()` CSS for `.section-masthead`, tables (rule-strong borders, mono caps headers per brand spec §2), and document-control trailing blocks.
- `astro.config.mjs` markdown.remarkPlugins — registers the section-masthead plugin globally so it applies to all markdown including future content collections.
- **Collection entry IDs are flat basenames** (e.g. `imprint`, not `en/imprint`) when using Astro v6's glob loader without a custom `generateId`. All 10 docs have unique basenames across en/ and pl/ so this works without collision; if a future page (e.g. `/en/x.md` and `/pl/x.md`) needs the same basename in both locales, configure the loader's `generateId` option.

**Shared component added:**
- `src/components/ContentPage.astro` — content-page shell used by all five supporting pages. Provides label/title/standfirst/meta header + a slot for body content. Body content uses `:global()` rules for h2/h3/h4/p/ul/ol/dl/blockquote so consumer pages can write plain HTML without re-declaring typography. Picks up the same serif-body / oxblood-accent / mono-cap-label register as the rest of the site.

**Sanity client extended:**
- `getAllArticleSummaries()` and `getAllProcedureSummaries()` — lightweight projections used by the index pages. Avoids pulling full Portable Text bodies just to render cards.

**Home page tweak:**
- The Specialty Blocks links at `/en/index.astro` switched from `/en/procedures/<category>` to `/en/procedures#<category>` so they land on the existing procedures-index anchor. Reverts to slash-form when dedicated category pages ship.

**What's still required to launch (Phase 9 QA):**
- Author 3 more articles (scaphoid-fractures, flexor-tendon-injuries-and-repair, extensor-tendon-injuries) so the home Articles teaser links resolve.
- Author 1-2 more procedures so each procedure-index category isn't empty.
- Polish-language `Contact` and `Publications` pages — these are the ONLY supporting pages without Polish mirrors (the legal pages all have PL mirrors via the locked legal-pages-package). The English `/en/contact` page is now spec-locked to v1.0 (2026-05-02 — see "Phase 8 update 2026-05-02"); `/pl/kontakt` waits for the Polish composition session. Hreflang `pl-PL` link is already emitted as a forward reference and will resolve once the route lands.
- Resend-backed contact form server endpoint — Phase 10 (needs Vercel adapter).
- Formal lawyer review (NZ + PL) of all five legal documents — queued for October 2027 per legal-pages-package `_meta/README.md`.
- Verification of live registry entries: PWZ 2985148 on rejestr.nil.org.pl, MCNZ 93463 on mcnz.org.nz (per package open items list).

Build status after the session: `npm run type-check` 0 errors. `npm run build` 12 pages. Working tree dirty (no commits — held off so you can review the diff).

## Phase 6 — what shipped (scaphoid-fractures expert article)

The 2026-04-29 session published the first long-form expert article (`/en/blog/scaphoid-fractures`) from the v1.7 implementation package at `01-brand-system/articles/scaphoid-fracture/`. Peer audience, FESSH-prep, 4,500 words, 30 references, 16 glossary terms.

**User decisions for the four real gaps the package didn't cover:**
- Glossary tooltip rendering pulled forward (Tier 2 Feature 5 partial — schema + component, not the index/detail pages).
- `glossaryTerm` schema extended to its full Tier 2 shape (per `_handoff/features/05-glossary-system.md`) so the package YAML's `category`/`synonyms`/`relatedTerms`/`termPolish`/`fullDefinition` data isn't lost.
- Author byline component added (was hard-coded in footer only; schema's `author` reference field was unused on the article page).
- Heroless publish — `heroImage` is optional in the schema; figures are added incrementally as Mateusz authors the SVGs and sources the AnatomyStandard CC-BY images.

**Schema and component changes**
- `studio/schemas/glossaryTerm.ts` — extended from a 3-field stub to the full Tier 2 shape (term/termPolish/slug/category enum/shortDefinition/shortDefinitionPolish/fullDefinition+Polish blocks/synonyms tags/relatedTerms refs/illustration/notesForMateusz). Schema not yet deployed (open item #9 still applies); local Studio reads from file, so authoring works.
- `src/components/content/GlossaryTerm.astro` — NEW. Modeled on `Citation.astro`. Renders a dashed-underline `<button>` trigger and `<aside popover="auto">` showing term, category (mono caps), and short definition. Per-occurrence unique `popoverId` via the markDef `_key` (avoids the duplicate-id pattern of `Citation.astro` open item #10). Zero JS, native Popover API. The locked spec's "More about this term →" link is suppressed for now — `/en/glossary/[slug]` index/detail pages remain Tier 2.
- `src/components/content/PortableTextSpan.astro` — wires the `glossaryTerm` mark. When a span has a glossary mark, the text is wrapped in `<GlossaryTerm>` instead of being emitted as plain HTML. Decorators and link wrapping are skipped on glossary spans (a `<button>` can't legally nest inside an `<a>`); the article body convention puts plain text inside `[gloss:...|...]` markers, so this is a non-issue in practice.
- `src/components/content/PortableTextRenderer.astro` — accepts and forwards a `glossaryTerms` prop alongside `references`, including down into recursive `<Astro.self>` callouts.
- `src/lib/sanity.ts` — added `SanityGlossaryTerm` type, `getGlossaryTermsByIds()`, `extractGlossaryOrderFromBlocks()` (refactored alongside `extractCitationOrderFromBlocks` into a shared `extractMarkOrderFromBlocks()` walker filtered by mark type). `ARTICLE_PROJECTION` now projects `author->{name, credentials, title, role}` instead of the raw `_ref`. `SanityArticle.author` typed as `ArticleAuthor | null` — null when the reference is unresolved.
- `src/pages/en/blog/[slug].astro` — fetches glossary docs via `extractGlossaryOrderFromBlocks` after the citation extraction; passes them to `<PortableTextRenderer>`. Author byline rendered as `<p class="article-byline">` between title and standfirst, mid-dot-separated (`Mateusz Gładysz · MD · FEBOPRAS · FEBHS`). Defensive byline logic: extracts post-nominal segments from whichever of `credentials` or `title` matches the all-caps comma-separated pattern (Phase 5 had populated these two fields the wrong way round in the seeded author doc).

**Author doc patched**
- The Phase 5 seed put the role string ("Consultant Plastic and Hand Surgeon") into the `credentials` field and the post-nominals ("MD, FEBOPRAS, FEBHS") into a non-schema `title` field. The seed script (`site/scripts/seed-scaphoid-article.ts`) patches the author doc on every run: `credentials` ← post-nominals, `role` ← position title, `title` unset. Idempotent. The `[slug].astro` byline logic remains defensive (handles either layout) so newly authored author docs that follow the schema also work.

**Import pipeline**
- `scripts/import-scaphoid-article.ts` — pure Node script (uses `node --experimental-strip-types`, no `tsx` dep) that reads the four package files (`02-article-body.md`, `03-article-metadata.yaml`, `04-references.yaml`, `05-glossary-terms.yaml`) and emits a single JSON file containing `bibReferences[]`, `glossaryTerms[]`, and `articles[]` ready for seeding. Strips the authoring blockquote and the standfirst (which goes into `excerpt`, not body). H2-only headings (h3+ and lists are forbidden by the package and the script throws if encountered). Em-dashes pass through verbatim — no smart-typography pass. Citation marks (`[ref:slug]`) attach to the trimmed preceding text (drops the conventional pre-marker space so the rendered output is `text¹,` not `text¹ ,`). Glossary marks (`[gloss:slug|displayed]`) emit a span whose text is the displayed string with a `glossaryTerm` markDef pointing at `glossary-{slug}`. Stable `_key`s (`b1`, `s1`, `c1`, `g1`, …) ensure idempotent re-runs.
- `scripts/seed-scaphoid-article.ts` — one-shot seeder that uses `@sanity/client.createOrReplace()` (honors slug-form `_id`s, unlike Sanity MCP `create_documents_from_json` which always assigns fresh UUIDs). Three-stage flow: patch the author doc → seed 30 bibReferences → seed 16 glossary docs in two passes (without `relatedTerms` first to avoid circular cross-references like `scaphoid` → `avn` → `snac-wrist` → `scaphoid`, then patch each doc's `relatedTerms`) → seed the article. Idempotent (safe to re-run). Requires `SANITY_API_WRITE_TOKEN` in `.env.local`; intended to be revoked at sanity.io/manage immediately after the seed.
- `js-yaml` + `@types/js-yaml` added to devDeps for YAML parsing in the import script. `tsx` not added — Node 24's `--experimental-strip-types` is sufficient for ad-hoc TS scripts.
- `scripts/.scaphoid-import.json` (the import script's intermediate output) and any other `scripts/.*.json` are gitignored as transient artefacts; regenerable via `node --experimental-strip-types scripts/import-scaphoid-article.ts > scripts/.scaphoid-import.json`.

**Documents seeded into Sanity (production dataset)**
- 30 `bibReference` docs with slug-form `_id`s (`gelberman-menon-1980`, `dias-swifft-2020`, …, `bssh-girft-2024`). Plus 5 carpal-tunnel refs from Phase 5 = 35 total.
- 16 `glossaryTerm` docs with `glossary-{slug}` `_id`s. Cross-references via `relatedTerms` patched in pass 2.
- 1 `article` with `_id: article-scaphoid-fractures`. Plus 1 carpal-tunnel article from Phase 5 = 2 total.
- Author doc (UUID `2cbd8bcc-…`) patched: credentials ← `MD, FEBOPRAS, FEBHS`, role ← `Consultant Plastic and Hand Surgeon`, `title` unset.

**Build status after the session:** `npm run type-check` 0 errors, `npm run build` 19 pages (was 12 before; +1 article + +6 image variants). The article HTML renders with valid `MedicalScholarlyArticle` JSON-LD including a 30-entry `citation` array. Verified inline: byline `Mateusz Gładysz · MD · FEBOPRAS · FEBHS`, italic standfirst, JAMA Key Points (Question/Findings/Meaning), 49 numbered citation superscripts, 17 dashed-underline glossary triggers, 30 bibliography entries in document order, 49 em-dashes preserved as U+2014 (zero `--`), `Last clinically reviewed 29 April 2026`. Hero image suppressed cleanly when undefined.

**Image asks outstanding** (8 figures referenced by `06-image-manifest.yaml`, none uploaded):
- 3 from anatomystandard.com (CC-BY): `scaphoid-vascular-anatomy-diagram` (hero), `scaphoid-bone-morphology`, `snuffbox-anatomy-clinical-exam`
- 5 original SVGs Mateusz to author: `herbert-classification-figure` (replaces a legacy textbook screenshot), `imaging-pathway-algorithm`, `screw-trajectory-illustration`, `snac-staging-progression`, `decision-framework-flowchart`

**Quietly dropped (schema doesn't have the fields):** `relatedArticles`, `relatedProcedures` from the package metadata YAML. Cross-linking is manual until those fields are added.

**Open items added in this phase:**
- Citation popover-id duplication (open item #10) is now materially active — the scaphoid article cites multiple refs many times each. Same fix path (thread `_key` into `popoverId`).
- Schema deploy still pending (open item #9). The extended `glossaryTerm` lives only in local files until a logged-in `npx sanity@latest schema deploy` happens.
- Write token rotation (open item #1) — the Phase 6 seed used a temporary write token; revoke at sanity.io/manage → API → Tokens after each seed session.

## Phase 6 update 2026-04-30 — extensor + flexor articles, generalized migration scripts

Two more expert articles shipped (`/en/blog/extensor-tendon-injuries`, `/en/blog/flexor-tendon-injuries-and-repair`) and the migration pipeline was generalized so future articles drop in cleanly.

**Schema additions** (deployed via `npx sanity@latest schema deploy`):
- `article.standfirst` (text ≤600) — italic editorial intro rendered below byline. Distinct from `excerpt` (≤280, SEO/cards). The blog `[slug].astro` template falls back to `excerpt` when `standfirst` is absent (carpal-tunnel-syndrome).
- `article.relatedArticles` / `article.relatedProcedures` (arrays of references) — surfaced as a "Related" block at the end of each article.
- `glossaryTerm.shortDefinition` cap raised 400→450 (one term, `bowstringing`, was 416 chars). Popover layout absorbs the extra line cleanly.

**Generalized migration pipeline** (replaces the old scaphoid-specific scripts):
- `scripts/import-article.ts <folder>` — pure markdown→PT JSON converter for any v1.7-shaped article package at `01-brand-system/articles/<folder>/`. Output to `scripts/.<folder>-import.json`. Handles `bookChapter` references (Doyle in Green's), normalises authors-as-string vs authors-as-list, drops Polish placeholder strings (`null`, `[PENDING POLISH SESSION]`), warns on cross-package `relatedTerms`.
- `scripts/seed-article.ts <folder>` — idempotent `createOrReplace` writer with existence-aware filtering of `relatedArticles` / `relatedProcedures` / `relatedTerms` against the live dataset (drops unresolved refs; re-run to backfill once siblings exist). Accepts `SANITY_API_DEVELOPER_TOKEN` or `SANITY_API_WRITE_TOKEN`.
- To add another article: drop a v1.7 package into `01-brand-system/articles/<folder>/`, run `node --experimental-strip-types scripts/import-article.ts <folder> > scripts/.<folder>-import.json`, then `node --experimental-strip-types --env-file=.env.local scripts/seed-article.ts <folder>`. Re-seed any prior article whose `relatedArticles` lists the new slug to backfill that link.
- Old `scripts/import-scaphoid-article.ts` / `seed-scaphoid-article.ts` were replaced and deleted; the Phase 6 narrative below describes the original (scaphoid-specific) shape for historical context.

**Build status after the session:** `npm run type-check` 0 errors, `npm run build` 87 pages (was 55 — +2 articles + 30 derived glossary detail pages from new terms). Each article renders byline, italic standfirst, JAMA Key Points, citation sidenotes, glossary popovers, numbered bibliography, and a Related block linking to its two siblings.

**Known unresolved cross-references** (will backfill when targets ship):
- `flexor-tendon-injuries-and-repair → procedure flexor-tendon-repair`
- `scaphoid-fractures → procedure scaphoid-fracture-fixation`

Re-run `seed-article.ts` against the originating article once the procedure exists.

## Phase 8 update 2026-05-02 — contact page locked to v1.0 + office@ email convention

The contact page was redesigned from a flat-h2 supporting page to a five-§-numbered section structure (Practice / Referrals / Enquiries / Form / Privacy) per the locked content draft now at `01-brand-system/drgladysz-locked-content-contact-v1.0.md`. The Resend-backed `/api/contact.ts` server endpoint shipped alongside (Phase 8 deferred, brought forward when contact-page lock arrived).

**Decision #36 (recorded in `01-brand-system/decisions-v1.10.md`):**
> Contact page published email is `office@drgladysz.com`. Waikato Hospital email is not published. Patient referral pathway is via GP, not via website.

**`office@drgladysz.com` convention (now site-wide):**
- Updated literal `mateusz@drgladysz.com` → `office@drgladysz.com` across: `SiteFooter`, `/en/about` Person JSON-LD, `/en/index` Person JSON-LD, the `/api/contact.ts` fallback when `CONTACT_FORM_TO_EMAIL` env var is unset, all 8 site/src/content/legal mirrors (en + pl), and the canonical 10 files in `01-brand-system/legal-pages-package/` + brand-spec v1.9 + locked-content-home-and-about v1.6.3.
- Intentionally kept on the old address: `01-brand-system/drgladysz-brand-book-v1.7.html` (historical artefact, predates v1.8 spec) and the contact-v1.0 doc's narrative line that documents the env-var change itself.
- **Production env to set on Vercel before deploy:** `CONTACT_FORM_TO_EMAIL=office@drgladysz.com` (or remove the var; the code fallback applies).

**Form changes:**
- New required fields: `Subject` (≤160 chars) and `Privacy consent` checkbox tied to RODO Article 6(1)(a).
- New "Type of enquiry" option labels: `Professional / academic`, `Patient information`, `Media or speaking`, `Other`. Internal enum keys (`professional` / `clinical` / `editorial` / `other`) preserved for API back-compat; only the user-facing labels changed.
- CTA `Send enquiry` (was `Send message`).
- Rate-limit bumped from 60s/IP to **5 submissions per IP per sliding hour**.
- Honeypot + `RESEND_API_KEY` flow unchanged.
- Email subject line: `Contact form — {name} — {subject}` (subject now the dominant signal in the inbox).
- Email body records consent timestamp.

**Site infra additions:**
- `generateContactPageSchema({ url, locale, siteUrl })` in `src/lib/schema.ts`; emits `ContactPage` JSON-LD with no `telephone` / `address` (per Decision #22).
- `SiteLayout` for `/en/contact` now passes `alternateUrl="/pl/kontakt"` so the en-NZ / pl-PL / x-default hreflang triplet is emitted (the pl-PL target 404s until `/pl/kontakt.astro` lands; this is acceptable forward-reference behaviour).
- `HomeHero.astro` `ctaHref` default updated to `/en/contact#form` so "Make an appointment" deep-links to §04. The `<section id="form">` anchor lives on the §04 masthead container.

**Build status after the session:** `npm run type-check` 0 errors, `npm run build` builds without errors. Page count unchanged. Browser preview at `/en/contact` shows all five sections, full form with new fields, ContactPage JSON-LD, hreflang triplet, and `office@drgladysz.com` rendered in 10 places (inline mailto in §03 + form note + script error fallbacks + footer). Commits: `d23d8b1` (contact page + email convention) + `23aaf63` (legal-page mirror refresh).

## Tier 2 — what shipped 2026-04-29

Tier 2 features (Glossary, Calculators, FEBHS MCQ) were planned and largely built this session per the plan at `~/.claude/plans/continue-working-on-my-vectorized-finch.md`. Brand-spec amendment recorded in `01-brand-system/decisions-v1.9.md` (glossary moved forward to pre-launch).

**Glossary (pre-launch, Feature 5 closeout):**
- Index pages: `/en/glossary/` and `/pl/slowniczek/` (A-Z grouped, locale-aware sort, sticky letter nav, `DefinedTermSet` JSON-LD).
- Detail pages: `/en/glossary/[slug]` and `/pl/slowniczek/[slug]` (full definition via existing `PortableTextRenderer`, related terms, "Articles mentioning this term" via exact GROQ subquery `^._id in body[].markDefs[_type == "glossaryTerm"].term._ref`, `DefinedTerm` + `BreadcrumbList` JSON-LD).
- "More about this term →" link in `GlossaryTerm.astro` popover now goes live, locale-aware.
- All 16 seeded scaphoid terms have working detail pages. Build adds 34 pages (16 × 2 locales + 2 indexes).

**Calculators (Feature 3 — infrastructure + QuickDASH):**
- Schema expanded to full 6-tab Portable Text shape with `locale` field (separate-doc-per-locale convention) and `componentName` enum picking the Preact island.
- Page shells at `/en/calculators` + `/[slug]` + PL mirrors at `/pl/kalkulatory/...`. WebApplication JSON-LD with `applicationCategory: 'MedicalApplication'`. Citation + glossary marks supported in all 6 tabs.
- QuickDASH built end-to-end at `src/components/interactive/QuickDASH.tsx` (Beaton 2005 — formula `(sum/n - 1) × 25`, allow 1 missing of 11). Validated English question wording; PL still uses English questions with a notice (Polish-validated translation pending).
- Calculator registry at `src/components/interactive/registry.ts` — static-import map (NOT `import.meta.glob`, per the same lesson as image-registry). Returns `undefined` for unbuilt calculators; page renders a placeholder. Adding PRWE/Boston/MHQ/Mayo: build the .tsx + import to registry, no other wiring.
- **Clinical verification trail required per calculator before flipping it live.** See `_handoff/features/03-calculator-suite.md` and the plan's verification section.

**FEBHS MCQ — moved to `learn.drgladysz.com` sub-app (2026-04-29 evening):**
- Initial Tier 2 build placed MCQ at `/en/learn/` and `/pl/nauka/` on the main domain. This violated brand spec v1.8 Decision #29/30 (LMS / quiz platform on its own subdomain). The format was also wrong — built as "stem + 4–5 options pick one" when the FESSH format is "stem + 5 T/F statements".
- Reverted: deleted `/en/learn/`, `/pl/nauka/`, all `MCQ*` islands, `mcq-progress.ts`, `mcq-question.css`, `mcq-progress.css`, `mcq-topics.ts`, `portable-text.ts`, and the `mcqQuestion` schema. Footer "FEBHS prep" entry replaced with an external link to `learn.drgladysz.com`.
- Replaced with: a separate Astro project at `learn/` (sibling to `site/`); new schemas (`fesshReference`, `fesshMcq`, `fesshStatement`, `fesshMcqMetadata`, `fesshMockExam`) here in `site/studio/schemas/`; full FesshQuestion + MockExam (practice/exam modes) + Progress islands in `learn/src/components/`; 4 verified peer-reviewed questions and 18 references awaiting Mateusz's seed run via `learn/scripts/seed-fessh-package.ts`. See `learn/CLAUDE.md` for the sub-app's own docs and `01-brand-system/decisions-v1.10.md` for the brand-spec amendment.
- 301 redirects added to `astro.config.mjs`: `/en/learn` and `/pl/nauka` → `https://learn.drgladysz.com`.

**Cross-cutting infrastructure (kept):**
- `SiteNav` accepts `alternateUrl` prop forwarded from `SiteLayout` so language switcher resolves translated slugs (e.g. `/en/glossary/scaphoid` → `/pl/slowniczek/scaphoid`).
- Bilingual decision: glossary stays single-doc-bilingual (term + termPolish on the same doc); calculator is separate-doc-per-locale (matches `article` and `procedurePage` convention). FESSH MCQ on the sub-app is English-only.
- Main-site build now produces 55 pages: glossary 34 + calculator indexes 2 + supporting / articles / procedures 19. Calculator detail pages materialise as Mateusz authors calculator docs in Sanity.

**Outstanding for Tier 2 / sub-app:**
- Calculators: PRWE, Boston CTS, MHQ, Mayo Wrist islands (3-6h each, gated by validation-paper review per calculator); per-calculator audit-trail markdown at `_handoff/verification/{slug}.md`; clinical content authoring in Sanity (6 tabs each).
- learn.drgladysz.com: deploy Sanity schemas (`sanity schema deploy`); seed 4 questions + 18 references via `learn/scripts/seed-fessh-package.ts`; provision Vercel project + DNS at Zenbox (Phase L11 in the subdomain plan); curate first `fesshMockExam` doc once question count nears 60+.
- Polish chrome polish: glossary + calculator index page copy is functional draft — the dedicated Polish composition session should refine.

## Post-launch sessions 2026-05-02 → 2026-05-03

The site cut over to production on 2026-05-02 (Phase 10 done, ahead of formal Phase 9 QA). Three substantive sessions landed since:

**Session 2026-05-02 (legal + about):**
- Legal pages cleaned of drafting-process intrusions (consent newsletter line referencing the brand spec; "MVP" / "this version" language; "locked inline qualifier" in disclaimer). Versions bumped v1.0 → v1.1 across consent, zgoda, disclaimer, zastrzezenie-medyczne. Canonical sources at `01-brand-system/legal-pages-package/` re-mirrored to `site/src/content/legal/`. Commit `9d1f5b2`.
- About page img-19 PhotoBreak switched from `aspect="4/5"` + `maxHeight="90vh"` (tall portrait pillar) to `aspect="16/9"` (full-width landscape, matching img-08).

**Session 2026-05-03 (procedure pages — Decision #37):**
- Brand spec amendment v1.9 / Decision #37 locked: AO 10-section spine remains third-person clinical; pitfall callouts may use selective first-person where the warning's substance is the surgeon's named technical opinion. Documented in `01-brand-system/drgladysz-brand-spec-amendment-v1_9-pitfall-voice.md` and recorded in `decisions-v1.10.md` § Decision #37.
- `_handoff/features/02-procedure-schema.md` bumped 1.7 → 1.8: pitfall field description amended; new "Editorial note (v1.9)" section; verification checklist gains pitfall-voice + AO-spine-third-person rules; new "Authoring rule (locked 2026-05-03)" — every procedure page ships with citation + glossaryTerm marks fully wired on first publish (no bare superscripts, no stripped `[[term]]` markers).
- Open carpal tunnel release procedure rewritten end-to-end via `site/scripts/seed-procedure-octr.ts` (~800 lines): created 29 new glossaryTerm docs + 14 new bibReference docs, rewrote all 10 AO sections with body content using the inline DSL `[g:slug|displayed]` for glossary marks and `{n}` for citation positions. 5 of 6 key steps carry first-person pitfall callouts. Commits `621d0d2`, `02417d2`.
- `src/pages/en/procedures/[slug].astro` now extracts both `extractCitationOrderFromBlocks` AND `extractGlossaryOrderFromBlocks`, threads `references={references}` AND `glossaryTerms={glossaryTerms}` into all 11 PortableTextRenderer call sites. Live verification: 25 citation popovers + 30 dashed-underline glossary triggers.

**Session 2026-05-03 (FESSH MCQ — Decision #34):**
- Brand spec amendment v1.8.1 / Decision #34 locked: FESSH MCQ on `learn.drgladysz.com` is single-author authored and literature-checked, NOT peer-reviewed. The terms "peer-reviewed", "peer review", "expert-reviewed", "validated" are forbidden across the subdomain (in copy, JSON-LD, descriptions). Permitted: "single-author", "literature-checked", "primary-literature cited", "community-corrected", "rigorously authored". Documented in `01-brand-system/update/drgladysz-amendment-feature-04-mcq-v1_8_1.md`.
- `studio/schemas/fesshMcqMetadata.ts` extended with `firstPublishedDate` (date) and `errataLog` (structured array — date / summary / resolution enum / notes); `peerReviewed`/`peerReviewer`/`peerReviewDate` deprecated and hidden in studio. Schema redeployed via `npx sanity@latest schema deploy`. Commit `58165db`.
- Subdomain copy (home + about + footer) rewritten across two patches — content-patch v1.0 then v1.1 (v1.1 fixed editorial intrusion, including a comparative claim about "many practising hand surgeons" that breached the locked About-page rule). Each published question now renders the `<QuestionMetadata>` audit-trail block (Question ID / First published / Last reviewed / Version) above the existing FesshFeedback errata link. All 11 currently-published questions backfilled with `firstPublishedDate` via `learn/scripts/backfill-fessh-metadata.ts`.
- Cross-link rule: drgladysz.com expert articles + procedure pages may link to a specific MCQ question only after that question has been live ≥30 days without unresolved errata flags. Authoring rule, not a code check.

**Session 2026-05-03 (CTS content drop — Decision #38):**
- Two new CTS articles + 4 new MCQs shipped in a single drop. Brand spec amendment / Decision #38 locked: v1.7 article-package convention now permits h3 subsections and bullet/numbered lists in `02-article-body.md`. h4+ remains forbidden. Voice rules unchanged. Documented in `01-brand-system/decisions-v1.10.md` § Decision #38.
- `scripts/import-article.ts` rewritten with a line-aware walker: handles h2/h3, bullet/numbered lists (single-line items), `> blockquote` callouts, `**bold**` decorator, and `[text](url)` link DSL. Existing scaphoid/extensor/flexor packages still import byte-identically (those bodies use no h3/list/blockquote/link, so the new walker branches never fire).
- `scripts/seed-article.ts` `filterExistingRefs` extended: when an `_id` lookup misses, falls back to `slug.current` lookup against the matching document type. Resolves Phase-5 UUID-form `_id` dupes to live `_id`s automatically (e.g. article→procedure cross-links via `procedure-{slug}` resolve the live UUID procedure doc).
- New articles: `/en/blog/carpal-tunnel-syndrome-fessh-prep` (peer audience, 4,200 words, 13 §-sections × ~30 h3 subsections, 71 citation marks, 21 glossary tooltips, 7 examination-notes blockquotes, 75 bullet items) and `/en/blog/carpal-tunnel-syndrome` (patient audience, 1,300 words, replaces Phase-5 UUID placeholder via preflight delete; cross-link references re-pointed during preflight).
- Q13–Q16 ulnar-nerve series shipped on `learn.drgladysz.com`: 4 new MCQs (cubital-tunnel-management, ulnar-nerve-lesions-overview, ulnar-palsy-reconstruction, ulnar-neuropathy-electrodiagnostics), 26 new fesshReferences, taking total published from 11 → 15. Q13-16 README + JSON normalised against Decision #34 forbidden-vocabulary list before seed.
- New helper scripts: `scripts/preflight-delete-legacy-cts-patient.ts` (one-shot legacy-doc cleanup with inbound-ref stripping), `scripts/backfill-octr-related.ts` (sets procedure relatedArticles[]), `scripts/cleanup-uuid-bibref-orphans.ts` (idempotent UUID-form bibRef dedup — resolves dupes by PMID, re-points body markDefs across article body[] and procedure section bodies, deletes the UUID).
- Cleanup pass (separate post-drop step): 2 UUID-form bibReference dupes deleted (`0eedaaa6-...` Padua 2016, `64887bae-...` Atroshi 1999). 3 UUID docs kept — genuinely unique citations (Louie 2012, Vasiliadis 2014 PMID 24482155, Phalen 1966).
- Pre-existing type error fixed: `src/pages/en/procedures/[slug].astro:296` was passing `glossaryTerms` to `<Bibliography>` (the component doesn't accept that prop). Removed.
- Sanity counts after drop+cleanup: bibReference 153 (107 → +46 net new), glossaryTerm 69 (60 → +9), article 5 (4 → +1; patient placeholder replaced in-place), fesshMcq published 15 (11 → +4), fesshReference 81 (55 → +26). Site build: 165 pages. Learn build: 32 pages.
- Procedure page schema gap (known limitation): `procedurePage` schema has no `relatedArticles` field. The cleanup script's `backfill-octr-related.ts` writes the field anyway via `client.patch().set()`, so the data is on the doc, but the procedure template doesn't render it. Article→procedure direction (which the article template DOES render) shows correctly. Add `relatedArticles` to the procedure schema and template in a future session.

## Phase 9 starting context (next session)

Phase 9 is **pre-launch QA — compliance, performance, accessibility**. See `_handoff/technical/compliance-checklist.md` for the full list.

**Recommended sweep:**
1. Lighthouse audit on each route — confirm LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms (the perf budgets in the don'ts list above).
2. axe / WAVE accessibility audit — focus on the new supporting pages (forms, dl semantics) and the citation popovers (focus management, escape behaviour).
3. Compliance audit — run through `_handoff/technical/compliance-checklist.md` line by line. Particular attention to: no testimonials, no patient images, expanded post-nominals on first appearance per page, footer disclaimer band on every page (already implemented in `SiteFooter.astro`).
4. Polish composition session — once locked PL content exists, mirror `/en/...` routes under `/pl/...` per the `routing-and-redirects.md` slug table, **excluding FESSH-prep articles** (English-only by design; see Locale conventions).
5. Schema deploy — run `cd site && npx sanity login` then `npx sanity@latest schema deploy` so the deployed schema matches local for any third-party validators.

**Things NOT to start yet:**
- Tier 2 features (calculators, MCQ, glossary) — post-launch.
- Vercel deployment — Phase 10.

---

## Useful commands

```bash
# Dev
npm run dev              # Astro dev server → http://localhost:4321/en/
npm run studio:dev       # Sanity Studio → http://localhost:3333/

# Build & verify
npm run build            # Production build → dist/
npm run preview          # Serve dist/ locally
npm run type-check       # astro check + tsc --noEmit

# Studio deploy (later)
npm run studio:deploy    # Push studio to *.sanity.studio
```
