# Phase 5 — overnight session notes

**Date:** 2026-04-28 (overnight from the 28th).
**Goal:** Tier 1 features per `_handoff/features/01-citation-system.md` and `02-procedure-schema.md`.
**Status:** Infrastructure complete. Build clean (4 pages, 0 type errors). Live in Sanity — review tomorrow.

---

## Quick links to review (after `npm run dev` from `/site`)

- `http://localhost:4321/en/` — home (unchanged from Phase 3, sanity-check it still renders)
- `http://localhost:4321/en/about` — about (unchanged from Phase 4)
- **`http://localhost:4321/en/blog/carpal-tunnel-syndrome` — seeded test article (Patient information)**
- **`http://localhost:4321/en/procedures/open-carpal-tunnel-release` — seeded test procedure (Hand surgery)**

Also: `npm run studio:dev` → `http://localhost:3333/` to see the documents in Sanity Studio. The schema is loaded locally; the deployed schema is still empty (see "Schema deploy" below).

---

## What to look at first

**The two seeded pages are the visual proof of the citation system.** They're both real, citation-rich content — feel free to refine the prose, but don't expect them to be production copy: they were authored to exercise the components, not as final clinical writing.

1. **Article page (`/en/blog/carpal-tunnel-syndrome`)**
   - Patient-audience article, 7 paragraphs + 1 pearl callout.
   - 3 in-text citation markers (Atroshi 1999, Padua 2016, Louie 2012).
   - Bibliography at the end with Vancouver formatting + PubMed/DOI/PMC links.
   - **Look at how the citation sidenotes float** in the right gutter on desktop ≥1024px. On a narrow viewport, click a citation marker — the popover should open. (Native HTML Popover API; no JS shipped.)
   - JSON-LD: `MedicalWebPage` with the 3 citations populated.

2. **Procedure page (`/en/procedures/open-carpal-tunnel-release`)**
   - Peer-audience full AO Surgery Reference structure.
   - In-page table of contents linking to each numbered section.
   - All 10 sections rendered, with citations distributed across `indications`, `anatomy`, `aftercare`, `complications`, and `evidence`.
   - 4 numbered key steps with 2 pitfall callouts.
   - Collapsible "For patients" plain-language summary at the bottom.
   - JSON-LD: `MedicalProcedure` with `bodyLocation`, `preparation`, `followup`, `expectedPrognosis`, `indication`, and `citation` populated.

**What I'd value a second pair of eyes on:**

- **Tufte sidenote vertical positioning.** The sidenotes use `float: right` + `clear: right` so they stack down the right gutter as the citation markers appear in source order. This is the cleanest pure-CSS solution but it doesn't perfectly align each sidenote with its in-text marker — when two citations are in the same paragraph, the second sidenote stacks below the first rather than next to its own line. If you want exact alignment, the alternative is JS-driven y-position calculation (which would ship a small client-side script). Worth your judgement call.
- **Bibliography Vancouver style nuances.** I'm using the ICMJE 6-author rule (list 6 then "et al.") and the standard Vancouver order: authors → title → *journal* → year;volume(issue):pages. Open to refinements per the journals you cite most often.
- **Is "Reference X" a useful label inside the sidenote?** I added a small mono cap header inside each sidenote (e.g. "REFERENCE 2") so it's clear what the panel is for, but it's redundant with the superscript number. Easy to remove.
- **Citation marker style.** Currently a 0.72em mono accent superscript with a dotted underline. Try interacting with it — focus state, hover, click.

---

## What was built (file map)

### Sanity schemas (`studio/schemas/`)

- **`bibReference.ts`** (was `reference.ts`, renamed because Sanity reserves the word). Vancouver/AMA shape: authors[], title, journal, year, volume, issue, pages, PMID, DOI, PMCID, URL, pubType (journal/book/chapter/conference/online/guideline), editors[]/publisher/publisherLocation/edition for books and chapters, optional abstractPreview. Studio shows the document type as **"Reference (citation source)"** — the rename is internal-only.
- **`procedurePage.ts`** — full AO Surgery Reference 10-section structure. Required fields: title, slug, category, audience, lastUpdated, summary, indications, anatomy, approach, keySteps (≥2), aftercare, complications, evidence. Optional: contraindications, positioning, closure, patientSummary, keyPoints, heroImage, SEO meta. Authoring discipline is enforced — no procedure publishes without indications/anatomy/approach/key-steps/aftercare/complications/evidence.
- **`callout.ts`** (new) — shared inline object with `type` (info/warning/pearl), optional title, content as Portable Text. Registered as a top-level type so both `article.body` and procedure clinical sections can include it. The legacy inline definition that lived in `article.ts` was removed.
- **`article.ts`** — citation mark now points at `bibReference` (one-line update).

### Frontend libraries (`src/lib/`)

- **`sanity.ts`** — typed Sanity client + GROQ accessors. Highlights:
  - `getAllArticleSlugs()`, `getArticleBySlug()`, `getAllProcedureSlugs()`, `getProcedureBySlug()`, `getReferencesByIds()`.
  - `extractCitationOrderFromBlocks(blockGroups)` walks every Portable Text array on a doc (and recurses into callout content) returning the unique reference IDs in document order. This is the canonical bibliography order.
  - `urlForImage()` for Sanity asset CDN URLs.
  - **`useCdn: false`** intentionally — see "CDN gotcha" below.

- **`citations.ts`** — Vancouver/AMA formatter. Pure JS, no `citation-js` runtime. Five functions:
  - `parseAuthorName("Smith JK")` → `{ family: "Smith", given: "JK" }`. Handles compound surnames and particles.
  - `formatAuthorList(authors)` — ICMJE rule (≤6 authors listed, then "et al").
  - `formatVancouver(ref, { withLinks })` — full HTML reference string for the bibliography. Branches on pubType (journal / book / chapter / online / guideline).
  - `formatShortRef(ref)` — compact author-year-journal label for the sidenote/popover.
  - `formatAuthorYear(ref)` — "Smith et al. 2024" style, available for in-prose use.
  - `pubmedUrl()`, `doiUrl()`, `pmcUrl()` — link helpers.

- **`schema.ts`** — JSON-LD generators:
  - `generateArticleSchema()` → `MedicalScholarlyArticle` (peer/expert) or `MedicalWebPage` (patient), with `citation` array.
  - `generateProcedureSchema()` → `MedicalProcedure` with bodyLocation/preparation/followup/expectedPrognosis populated from the matching clinical sections.
  - `generateBreadcrumb()` → `BreadcrumbList` helper.

### Components (`src/components/content/`)

- **`Citation.astro`** — inline citation marker. Renders a `<sup>` button that targets a `<aside popover="auto">`. On desktop ≥1024px the aside is force-shown via CSS overrides, floats right, lands in the article's reserved right gutter. On mobile the aside hides until tapped (native Popover API). Print stylesheet renders sidenotes inline below paragraphs.
- **`Bibliography.astro`** — numbered Vancouver-formatted reference list at the end of the article. Anchors at `#ref-N`, sticky-header `scroll-margin-top`, `:target` highlight when jumped to from a sidenote.
- **`KeyPoints.astro`** — JAMA-style summary box. Three labeled rows (Question / Findings / Meaning), Findings and Meaning labels override-able for procedures (Indications / Clinical relevance).
- **`Callout.astro`** — info / warning / pearl visual treatments. Oxblood accent rule, mono cap label.
- **`PortableTextRenderer.astro`** — custom Portable Text walker. Handles block styles (h2-h6, blockquote), bullet/number lists, callouts (recurses via `<Astro.self>`), images, and the marks tree. Built without `astro-portabletext` because that package's component-prop pattern doesn't compose well with the per-page bibliography index.
- **`PortableTextSpan.astro`** — span-level mark renderer; decorators stack from inside out, link wraps, citation appends a numbered superscript marker AFTER the span.

### Routes (`src/pages/en/`)

- **`blog/[slug].astro`** — article detail. `getStaticPaths` over Sanity articles. Reserves a 320px right gutter on desktop ≥1024px so floated citation sidenotes land in the margin without overlapping body. Renders `KeyPoints` (if populated) → `PortableTextRenderer` → `Bibliography`.
- **`procedures/[slug].astro`** — procedure detail. Same gutter + `PortableTextRenderer` pattern, but renders the 10 AO sections explicitly with `<section>` headings, an in-page TOC, numbered key-step list with optional figure + pitfall callout per step, and the collapsible "For patients" plain-language summary.

---

## CDN gotcha (one-line postmortem)

The Sanity client's `useCdn: true` cached an empty result for ~minutes after I first published the seed documents. Build returned `0 paths` from `getStaticPaths` even though the docs were queryable directly. Switched to `useCdn: false` for builds — content is always fresh, perf hit is invisible because builds are not user-facing. Documented in `src/lib/sanity.ts` and CLAUDE.md.

---

## Schema deploy (still pending)

`npx sanity@latest schema deploy` needs an interactive `sanity login` which I couldn't run autonomously. The local Studio (`npm run studio:dev`) reads schemas from the local TypeScript files, so the editing UI works either way. Only two things need the deployed schema:

1. The Sanity MCP `get_schema` tool (used by AI assistants — non-blocking for the site).
2. Server-side validation on writes — currently nothing validates because no schema is deployed.

To deploy when convenient: `cd site && npx sanity login` (browser flow) → `npx sanity@latest schema deploy`.

---

## Known issues / cleanup items

- **Duplicate popover IDs when same ref is cited >1× in a doc.** `Citation.astro` builds `popoverId = cite-{refId}-{index}`. Index is per-ref, so two markers for the same ref render the same popover element twice. The browser still works (both buttons target the same id), but it's invalid HTML. Fix: thread the markDef `_key` into Citation. Affects the seeded procedure where Padua 2016, Louie 2012, and Vasiliadis 2014 are each cited twice.
- **`/en/blog` and `/en/procedures` index pages don't exist.** Detail pages and the home page link to them. Phase 6 (blog index) and Phase 7 (procedure index) build them out.
- **Sanity 5 not bumped.** Existing v4 works cleanly with the new schemas; v5 bump deferred to a session that has a specific reason.
- **No tests yet.** Nothing in the project tests citation order, Vancouver formatting edge cases, or the Portable Text walker. Worth adding a Vitest pass with a few golden-output tests before Phase 9 QA.

---

## How to undo / clean up the seeded content

If any of the seed content is wrong or you want a clean slate:

```bash
cd site
npx sanity@latest documents delete \
  d8b7240c-d260-417c-a24d-815044089474 \   # article
  e238943e-dc53-40ad-b02c-b4ba2ed07702 \   # procedure
  2cbd8bcc-fe62-4d80-8bd4-a1a345dcf472 \   # author Mateusz
  0eedaaa6-b2ba-4f47-82ac-559ba81bea54 \   # bibRef Padua 2016
  64887bae-712a-4c69-ba9e-09ec5a05a6eb \   # bibRef Atroshi 1999
  ec878ba0-745e-4657-8d7b-024102d6ca2c \   # bibRef Phalen 1966
  4c61cd14-629e-464a-be3a-7b1aacf1da70 \   # bibRef Louie 2012
  d498a81c-27f1-4698-bb00-2642fa1631e1     # bibRef Vasiliadis 2014
```

Or just edit them in Studio and republish.

---

## Build state

```
$ npm run type-check
✓ astro check && tsc --noEmit
✓ 0 errors, 0 warnings (4 pre-existing hints from before Phase 5)

$ npm run build
✓ 4 pages built (en/, en/about/, en/blog/carpal-tunnel-syndrome/, en/procedures/open-carpal-tunnel-release/)
✓ 105 image variants
✓ sitemap-index.xml created
```

Nothing is committed yet — the working tree is dirty. I held off on a commit because you might want to review and rewrite either the seed content or some of the component visuals before the diff goes into git history.

---

## Files changed since Phase 4 (`ab4b5a3`)

```
NEW   site/PHASE-5-NOTES.md                                     (this file)
NEW   site/src/components/content/Bibliography.astro
NEW   site/src/components/content/Callout.astro
NEW   site/src/components/content/Citation.astro
NEW   site/src/components/content/KeyPoints.astro
NEW   site/src/components/content/PortableTextRenderer.astro
NEW   site/src/components/content/PortableTextSpan.astro
NEW   site/src/lib/citations.ts
NEW   site/src/lib/sanity.ts
NEW   site/src/lib/schema.ts
NEW   site/src/pages/en/blog/[slug].astro
NEW   site/src/pages/en/procedures/[slug].astro
NEW   site/studio/schemas/bibReference.ts                       (renamed from reference.ts; old file removed)
NEW   site/studio/schemas/callout.ts
EDIT  site/CLAUDE.md                                            (Phase 5 → done; Phase 6 starting context; open items 9-12 added)
EDIT  site/sanity.config.ts                                     (Studio list item: bibReference)
EDIT  site/studio/schemas/article.ts                            (citation mark → bibReference; removed inline callout def)
EDIT  site/studio/schemas/index.ts                              (register bibReference + callout; remove old reference)
EDIT  site/studio/schemas/procedurePage.ts                      (full AO Surgery Reference shape)
DEL   site/studio/schemas/reference.ts                          (renamed to bibReference.ts)
```

About 1,500 LOC added.
