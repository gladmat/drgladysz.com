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
│   ├── components/                    PageContainer, SiteNav, SiteFooter, SectionMasthead, PhotoBreak
│   ├── layouts/                       BaseLayout (head/meta/preload), SiteLayout (wraps + slots nav/footer)
│   ├── lib/                           images.ts (manifest reference), image-config.ts (shared pipeline constants)
│   └── pages/en/                      English routes (Polish under pages/pl/, separate composition)
├── studio/schemas/                    Sanity schemas — most are stubs until their build phase
├── astro.config.mjs                   Astro config — i18n, redirects, sitemap, Tailwind via Vite plugin
├── tailwind.config.ts                 JS config holding Aarau Graphite tokens (loaded via @config in globals.css)
├── sanity.config.ts                   Studio config (standalone, runs via `npm run studio:dev`)
└── .env.local                         (gitignored) Sanity project ID + tokens, Plausible domain, etc.
```

`_handoff/content/*.md` is **locked at v1.6** — do not paraphrase the wording.

---

## Build phase status

| # | Phase | Status | Commit |
|---|---|---|---|
| 0 | Pre-build setup (accounts, fonts, photos) | ✅ done | n/a |
| 1 | Project scaffolding (npm install, Sanity schemas, env wiring) | ✅ done | `5abee72` |
| 2 | Layout components (PageContainer/SiteNav/SiteFooter/SectionMasthead/PhotoBreak) + state-of-the-art image pipeline | ✅ done | `fd4c58d` |
| 3 | **Home page composition** (from `_handoff/content/home-en.md` + `02-mockups/drgladysz-home-page-v1.6.html`) | **⬜ NEXT** | — |
| 4 | About page (from `_handoff/content/about-en.md` + about mockup) | ⬜ | — |
| 5 | Tier 1 features — Citation system + Procedure schema | ⬜ | — |
| 6 | Content infrastructure — blog index/template + WordPress MDX migration | ⬜ | — |
| 7 | Procedure pages | ⬜ | — |
| 8 | Supporting pages (/contact, /credentials, /imprint, /privacy, /disclaimer) | ⬜ | — |
| 9 | Pre-launch QA (compliance, perf, a11y) | ⬜ | — |
| 10 | Production cutover (DNS at Zenbox, monitor 404s, decommission WP after 30 days) | ⬜ | — |

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

---

## Sanity

- **Project ID:** `kwp48q91`. Dataset: `production`. Manage at [sanity.io/manage](https://www.sanity.io/manage).
- **Studio runs standalone** via `npm run studio:dev` (port 3333). Not embedded in Astro at `/studio`. The skeleton's "embedded studio" plan needed `@sanity/astro` (not in deps); standalone is simpler. Revisit if/when embedding becomes needed.
- **Schema status:**

| Schema | Status |
|---|---|
| `author` | ✅ full |
| `article` | ✅ full |
| `podcastEpisode` | ✅ full |
| `procedurePage` | 🟡 stub — flesh out in Phase 5 (Feature 2) |
| `reference` | 🟡 stub — flesh out in Phase 5 (Feature 1, citation system) |
| `glossaryTerm` | 🟡 stub — flesh out post-launch (Tier 2, Feature 5) |
| `mcqQuestion` | 🟡 stub — flesh out post-launch (Tier 2, Feature 4) |
| `calculator` | 🟡 stub — flesh out post-launch (Tier 2, Feature 3) |

- Sanity ecosystem at v4 (current); bump to v5 in Phase 5 when we exercise it heavily.

---

## Locale conventions (i18n)

- **English under `/en/`**, Polish under `/pl/`. Both prefixes always shown — never bare `/about`.
- **Polish content is independently composed** — never machine-translated from English. Awaiting native Polish composition session for Home, About, all procedure pages.
- **Polish slugs** (from brand spec §11): `/pl/o-mnie`, `/pl/zabiegi`, `/pl/publikacje`, `/pl/kontakt`, `/pl/uprawnienia`, `/pl/nota-prawna`, `/pl/polityka-prywatnosci`, `/pl/zastrzezenie-medyczne`.

---

## Brand details encoded in components

- **Wordmark / signature treatment:** `text-transform: lowercase` with `<span class="cap">M</span>` and `<span class="cap">G</span>` to keep the M and G uppercase. **No italic on the surname.** (The locked spec said italic on Gładysz; user overrode this — surname reads as a wordmark, not a quote.)
- **OR-shot color treatment** (img-04, img-09, img-10, img-12): editorial color grading per `_handoff/design/photo-manifest.md` (saturate teal -15%, warm shadow lift). The current PhotoBreak `saturate(0.96)` CSS is an MVP approximation; properly graded source files would be a finishing touch in Phase 9.

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

1. **Sanity API token rotation.** A read+write token was pasted in chat history during Phase 1 setup (2026-04-28). Rotate it in Sanity → Manage → API → Tokens, replace with a **read-only** token in `.env.local` (frontend doesn't need write). Studio uses session auth, no token.
2. **OR-shot color grading.** Editorial pass in Lightroom for img-04, 09, 10, 12 vs accepting current CSS `saturate(0.96)` approximation. Defer decision to Phase 9.
3. **Image storage strategy.** Currently 68MB of source photos in git history. Migrate to Sanity asset CDN if git size becomes annoying — schemas already designed for it.
4. **Polish content composition.** Native Polish session pending for Home, About, procedure pages, blog posts.
5. **Embedded vs standalone Sanity Studio.** Standalone now; revisit if you want `/studio` on drgladysz.com (would add `@sanity/astro` dep).
6. **Dependency major bumps.** Sanity 4→5, Resend 4→6, TypeScript 5→6, Preact Signals 1→2 are available. Recommend bumping Sanity in Phase 5 when we exercise it heavily; rest can wait.

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
