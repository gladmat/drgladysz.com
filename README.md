# drgladysz.com

Personal-brand and content website for **Mateusz Gładysz, MD, FEBOPRAS,
FEBHS** — Consultant Plastic and Hand Surgeon. Articles, procedures,
glossary, clinical calculators, and supporting pages.

The FESSH MCQ sub-application lives at **`learn.drgladysz.com`** as a
separate Astro project ([gladmat/learn.drgladysz.com](https://github.com/gladmat/learn.drgladysz.com)).

## Stack

- [Astro 6](https://astro.build) (static output)
- [Preact](https://preactjs.com) for interactive islands (calculators)
- [Sanity 4](https://www.sanity.io) for content (project `kwp48q91`)
- [Tailwind 4](https://tailwindcss.com)
- [Vercel](https://vercel.com) for hosting (Phase 10 cutover from
  WordPress at Zenbox)

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in Sanity project ID
npm run dev                        # http://localhost:4321/en/
npm run studio:dev                 # Sanity Studio at http://localhost:3333/
```

## Build

```bash
npm run build         # static output to dist/
npm run preview
npm run type-check    # astro check + tsc --noEmit
```

## Deployment

Target launch: September 2026. Vercel project not yet provisioned.
Phase 9 (pre-launch QA) is next; Phase 10 is the production cutover
(DNS at Zenbox, monitoring 404s, decommissioning the WordPress install
after a 30-day overlap).

## Project notes & conventions

See [CLAUDE.md](./CLAUDE.md) for the full architecture, brand
conventions, build phase status, schema documentation, and Sanity
operational notes.

Locked content and design specs live in
[`_handoff/`](./_handoff/) (mirror of the canonical
`01-brand-system/` package one level up — not in this repo).

## License

All rights reserved. Clinical content authored by Mateusz Gładysz, MD,
FEBOPRAS, FEBHS, and is not a substitute for consultation with a
qualified practitioner.
