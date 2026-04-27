---
feature: citation-system
tier: 1
ships_with: article-1
effort_hours: 16-24
maintenance: low
status: locked
version: 1.7
---

# Feature 1 — Citation system with Tufte sidenotes

**The single highest-leverage feature on the site.** Vancouver/AMA-formatted scholarly citations rendered as right-margin sidenotes on desktop (Tufte CSS pattern) and as native HTML Popover API tap-popovers on mobile. This is the spine of academic-medical authority and ships with the very first article.

---

## Why this feature is decisive

Most surgeon personal sites under-cite or use blog-style hyperlinks. Vancouver/AMA formatting matches what *Journal of Hand Surgery* and *Plastic and Reconstructive Surgery* readers expect. Strong PubMed citation density also functions as an LLM/AI surfacing signal — large language models weight verifiable scholarly references heavily when generating answers about medical topics.

Without this system the site reads as a blog regardless of content quality. With it, the site signals scholarly rigor immediately to peer surgeons, search engines, and LLM training pipelines.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│  Sanity reference document (typed schema)               │
│  - authors, journal, volume, issue, year, pages         │
│  - PMID, DOI, PMCID                                     │
│  - optional abstract preview                            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Portable Text inline mark "citation"                   │
│  - references reference document by _ref                │
│  - rendered as superscript number in body text          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  citation-js + Vancouver CSL pipeline (build-time)      │
│  - generates formatted reference string                 │
│  - zero JavaScript shipped to client for formatting     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────┬──────────────────────────────┐
│  Desktop (≥1024px)       │  Mobile (<1024px)            │
│  Tufte sidenote in       │  Native Popover API          │
│  right margin            │  tap to open popover         │
└──────────────────────────┴──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Auto-generated end-of-article bibliography             │
│  - collects all citations in document order             │
│  - numbered list with anchor links                      │
└─────────────────────────────────────────────────────────┘
```

---

## Sanity schema — `reference.ts`

```typescript
// studio/schemas/reference.ts
import { defineType, defineField } from 'sanity';

export const reference = defineType({
  name: 'reference',
  title: 'Reference (citation source)',
  type: 'document',
  fields: [
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Format: "Smith JK" — surname space initials',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'title',
      title: 'Article title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'journal',
      title: 'Journal',
      type: 'string',
      description: 'Use NLM abbreviation if available (e.g., "J Hand Surg Am")',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1900).max(new Date().getFullYear()),
    }),
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'string',
    }),
    defineField({
      name: 'issue',
      title: 'Issue',
      type: 'string',
    }),
    defineField({
      name: 'pages',
      title: 'Pages',
      type: 'string',
      description: 'Format: "123-130" or "123-30" abbreviated style',
    }),
    defineField({
      name: 'pmid',
      title: 'PubMed ID (PMID)',
      type: 'string',
      description: 'Numeric PubMed identifier',
      validation: (Rule) => Rule.regex(/^\d+$/, { name: 'numeric PMID' }).optional(),
    }),
    defineField({
      name: 'doi',
      title: 'DOI',
      type: 'string',
      description: 'Without "https://doi.org/" prefix, e.g., "10.1016/j.jhsa.2024.001"',
    }),
    defineField({
      name: 'pmcid',
      title: 'PMC ID',
      type: 'string',
      description: 'PubMed Central identifier if open access',
    }),
    defineField({
      name: 'abstractPreview',
      title: 'Abstract preview (optional)',
      type: 'text',
      rows: 4,
      description: 'First 2-3 sentences of abstract for popover/sidenote context',
    }),
    defineField({
      name: 'pubType',
      title: 'Publication type',
      type: 'string',
      options: {
        list: [
          { title: 'Journal article', value: 'journal' },
          { title: 'Book', value: 'book' },
          { title: 'Book chapter', value: 'chapter' },
          { title: 'Conference proceedings', value: 'conference' },
          { title: 'Online article', value: 'online' },
          { title: 'Guideline', value: 'guideline' },
        ],
      },
      initialValue: 'journal',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      authors: 'authors',
      year: 'year',
      journal: 'journal',
    },
    prepare({ title, authors, year, journal }) {
      const firstAuthor = authors?.[0] || 'Unknown';
      const etAl = authors?.length > 1 ? ' et al.' : '';
      return {
        title: title,
        subtitle: `${firstAuthor}${etAl} — ${journal} ${year}`,
      };
    },
  },
});
```

---

## Portable Text mark — citation inline

In the article schema, add a `citation` mark to the Portable Text definition:

```typescript
// In studio/schemas/article.ts (Portable Text body field)
{
  type: 'block',
  marks: {
    annotations: [
      {
        name: 'citation',
        type: 'object',
        title: 'Citation',
        fields: [
          {
            name: 'reference',
            type: 'reference',
            to: [{ type: 'reference' }],
            validation: (Rule) => Rule.required(),
          },
        ],
      },
      // ... other marks
    ],
  },
},
```

When the author selects text and applies the citation mark, they pick a reference document. The text gets wrapped in a citation annotation pointing at that reference.

---

## Vancouver CSL pipeline (build-time)

Install dependencies:

```bash
npm install citation-js @citation-js/plugin-csl
```

Create the citation formatter at `src/lib/citations.ts`:

```typescript
// src/lib/citations.ts
import { Cite } from 'citation-js';

interface SanityReference {
  _id: string;
  authors: string[];
  title: string;
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  pmid?: string;
  doi?: string;
  abstractPreview?: string;
}

export function formatVancouverCitation(ref: SanityReference): string {
  // Build CSL-JSON object from Sanity reference
  const cslData = {
    id: ref._id,
    type: 'article-journal',
    author: ref.authors.map(a => {
      const parts = a.split(' ');
      return {
        family: parts[0],
        given: parts.slice(1).join(' '),
      };
    }),
    title: ref.title,
    'container-title': ref.journal,
    issued: { 'date-parts': [[ref.year]] },
    volume: ref.volume,
    issue: ref.issue,
    page: ref.pages,
    DOI: ref.doi,
    PMID: ref.pmid,
  };
  
  const cite = new Cite(cslData);
  return cite.format('bibliography', {
    format: 'html',
    template: 'vancouver',
    lang: 'en-US',
  });
}

export function buildBibliography(references: SanityReference[]): string {
  // Returns formatted HTML for end-of-article references section
  // Each reference numbered, with anchor for return-link from sidenote
  return references.map((ref, i) => `
    <li id="ref-${i + 1}" class="bibliography-entry">
      <span class="ref-number">${i + 1}.</span>
      <span class="ref-content">${formatVancouverCitation(ref)}</span>
      ${ref.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}" class="ref-link" target="_blank" rel="noopener">PubMed</a>` : ''}
      ${ref.doi ? `<a href="https://doi.org/${ref.doi}" class="ref-link" target="_blank" rel="noopener">DOI</a>` : ''}
    </li>
  `).join('\n');
}
```

---

## Citation component — `Citation.astro`

```astro
---
// src/components/content/Citation.astro
interface Props {
  reference: any; // Sanity reference object
  index: number; // 1-based position in article
}

const { reference, index } = Astro.props;
const { _id, authors, title, journal, year, volume, pages, pmid, doi, abstractPreview } = reference;

const firstAuthor = authors[0];
const etAl = authors.length > 3 ? ' et al.' : authors.length > 1 ? `, ${authors[1]}` + (authors.length > 2 ? ` et al.` : '') : '';
const formattedRef = `${firstAuthor}${etAl}. ${title}. ${journal}. ${year}${volume ? `;${volume}` : ''}${pages ? `:${pages}` : ''}.`;
const popoverId = `cite-${_id}`;
---

<sup class="citation-marker">
  <button 
    type="button"
    popovertarget={popoverId}
    class="citation-button"
    aria-label={`Citation ${index}: ${formattedRef}`}
  >
    {index}
  </button>
</sup>

<aside 
  id={popoverId}
  popover="auto"
  class="citation-popover"
  data-sidenote-index={index}
>
  <div class="citation-popover-content">
    <p class="citation-text">{formattedRef}</p>
    {abstractPreview && (
      <p class="citation-abstract">{abstractPreview}</p>
    )}
    <div class="citation-actions">
      {pmid && (
        <a 
          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
          target="_blank"
          rel="noopener"
          class="citation-link"
        >
          PubMed
        </a>
      )}
      {doi && (
        <a 
          href={`https://doi.org/${doi}`}
          target="_blank"
          rel="noopener"
          class="citation-link"
        >
          DOI
        </a>
      )}
      <a 
        href={`#ref-${index}`}
        class="citation-link"
      >
        Reference list ↓
      </a>
    </div>
  </div>
</aside>

<style>
  .citation-marker {
    font-family: var(--mono);
    font-size: 0.7em;
    line-height: 1;
  }
  
  .citation-button {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    text-decoration: none;
    border-bottom: 1px dotted var(--accent);
  }
  
  .citation-button:hover {
    color: var(--ink);
    border-bottom-color: var(--ink);
  }
  
  .citation-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  
  /* Popover styling */
  .citation-popover {
    border: 1px solid var(--rule-strong);
    background: var(--bg-card);
    padding: 16px 20px;
    max-width: 360px;
    border-radius: 0;
    box-shadow: 0 8px 24px rgba(20, 23, 26, 0.08);
    margin: 0;
  }
  
  .citation-popover::backdrop {
    background: rgba(20, 23, 26, 0.04);
  }
  
  .citation-text {
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.5;
    color: var(--ink);
    margin: 0 0 12px;
  }
  
  .citation-abstract {
    font-family: var(--serif);
    font-style: italic;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-2);
    margin: 0 0 12px;
    padding-left: 12px;
    border-left: 2px solid var(--rule);
  }
  
  .citation-actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .citation-link {
    font-family: var(--sans);
    font-size: 13px;
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
  }
  
  .citation-link:hover {
    color: var(--ink);
    border-bottom-color: var(--ink);
  }
  
  /* Desktop: render as Tufte sidenote */
  @media (min-width: 1024px) {
    /* Article container needs wide right margin */
    .article-content {
      max-width: 720px;
      margin-right: 320px;
      position: relative;
    }
    
    .citation-popover {
      /* Override popover positioning to act as sidenote */
      position: absolute;
      right: -320px;
      width: 280px;
      max-width: 280px;
      transform: translateY(-1.5em);
      box-shadow: none;
      background: transparent;
      border: none;
      border-left: 2px solid var(--rule);
      padding: 0 0 0 16px;
      display: block !important;
      opacity: 1;
    }
    
    .citation-popover::before {
      content: attr(data-sidenote-index);
      font-family: var(--mono);
      font-size: 11px;
      color: var(--accent);
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 4px;
    }
    
    .citation-popover::backdrop {
      display: none;
    }
  }
</style>
```

---

## Bibliography component — `Bibliography.astro`

```astro
---
// src/components/content/Bibliography.astro
interface Props {
  references: any[]; // Array of Sanity reference objects in citation order
}

const { references } = Astro.props;
---

{references.length > 0 && (
  <section class="bibliography" aria-labelledby="bibliography-heading">
    <h2 id="bibliography-heading" class="bibliography-heading">References</h2>
    <ol class="bibliography-list">
      {references.map((ref, i) => (
        <li id={`ref-${i + 1}`} class="bibliography-entry">
          <span class="ref-content">
            {ref.authors.slice(0, 3).join(', ')}
            {ref.authors.length > 3 ? ' et al.' : ''}
            . {ref.title}. <em>{ref.journal}</em>. {ref.year}
            {ref.volume ? `;${ref.volume}` : ''}
            {ref.issue ? `(${ref.issue})` : ''}
            {ref.pages ? `:${ref.pages}` : ''}.
          </span>
          <span class="ref-actions">
            {ref.pmid && (
              <a 
                href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`}
                target="_blank"
                rel="noopener"
              >
                PubMed
              </a>
            )}
            {ref.doi && (
              <a 
                href={`https://doi.org/${ref.doi}`}
                target="_blank"
                rel="noopener"
              >
                DOI
              </a>
            )}
          </span>
        </li>
      ))}
    </ol>
  </section>
)}

<style>
  .bibliography {
    margin-top: 80px;
    padding-top: 40px;
    border-top: 1px solid var(--rule);
  }
  
  .bibliography-heading {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 28px;
    margin: 0 0 32px;
    color: var(--ink);
  }
  
  .bibliography-list {
    list-style: none;
    counter-reset: ref-counter;
    padding: 0;
    margin: 0;
  }
  
  .bibliography-entry {
    counter-increment: ref-counter;
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-2);
    padding-left: 32px;
    position: relative;
    margin-bottom: 16px;
    scroll-margin-top: 80px; /* offset for sticky header on anchor jump */
  }
  
  .bibliography-entry::before {
    content: counter(ref-counter) ".";
    position: absolute;
    left: 0;
    top: 0;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--accent);
    font-weight: 500;
  }
  
  .bibliography-entry .ref-actions {
    display: inline-flex;
    gap: 12px;
    margin-left: 12px;
  }
  
  .bibliography-entry .ref-actions a {
    font-family: var(--sans);
    font-size: 12px;
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
  }
  
  .bibliography-entry:target {
    background: var(--bg-deep);
    margin-left: -16px;
    padding-left: 48px;
    transition: background 0.3s;
  }
</style>
```

---

## Article page integration

In the article page template, render Portable Text body with the citation mark, then append the bibliography:

```astro
---
// src/pages/en/blog/[slug].astro (excerpt)
import { PortableText } from 'astro-portabletext';
import Citation from '@/components/content/Citation.astro';
import Bibliography from '@/components/content/Bibliography.astro';
import { getArticleBySlug, getReferencesInOrder } from '@/lib/sanity';

const { slug } = Astro.params;
const article = await getArticleBySlug(slug);
const references = await getReferencesInOrder(article._id);

const portableTextComponents = {
  marks: {
    citation: ({ value, children }) => {
      const ref = references.find(r => r._id === value.reference._ref);
      const index = references.indexOf(ref) + 1;
      return (
        <>
          {children}
          <Citation reference={ref} index={index} />
        </>
      );
    },
  },
};
---

<article class="article-content">
  <h1>{article.title}</h1>
  <PortableText value={article.body} components={portableTextComponents} />
  <Bibliography references={references} />
</article>
```

---

## Performance considerations

- **Build-time citation formatting** via `citation-js` — zero runtime cost
- **Native Popover API** — no JavaScript library needed (Tippy.js is abandoned, Floating UI not needed for this use case)
- **CSS-only sidenote rendering** on desktop — no JS required for positioning
- **Total JS shipped per article:** 0 KB for citations (HTML/CSS only)

---

## Edge cases to handle iteratively

The Vancouver/AMA citation format has hundreds of edge cases. Plan for 2-3 follow-up sessions over the first content months to handle these as they arise:

- Multiple authors (3 vs 6 vs 20+ author handling — ICMJE says list 6 then "et al.")
- Books and book chapters (different CSL template)
- Online-first publications without volume/issue/pages yet
- Conference proceedings (separate format)
- Guidelines and consensus statements
- Multiple PMIDs per article (rare but happens)
- Polish-language citations (different conventions)
- Author name parsing edge cases (compound surnames, particles)

The `citation-js` library handles most of these correctly via the `vancouver` CSL template. When it doesn't, override the formatting in the citation function for that specific case.

---

## Verification before launch

- [ ] First 10 citations render correctly as both sidenote (desktop) and popover (mobile)
- [ ] PubMed links open correctly in new tab
- [ ] DOI links open correctly in new tab
- [ ] End-of-article bibliography numbers match in-text citation numbers
- [ ] Anchor jump from sidenote to bibliography entry works
- [ ] Highlighted bibliography entry on anchor target
- [ ] Schema.org `citation` field populated correctly in `MedicalScholarlyArticle` JSON-LD
- [ ] Citations remain functional with JavaScript disabled (HTML/CSS only)
- [ ] Mobile popover dismisses on outside click
- [ ] Keyboard navigation works (Tab to citation, Enter/Space to open, Escape to close)

---

## Effort estimate

- **Sanity schema + Portable Text mark setup:** 3-4 hours
- **citation-js + Vancouver CSL pipeline:** 4-6 hours
- **Citation.astro component (HTML/CSS):** 4-6 hours
- **Bibliography.astro component:** 2-3 hours
- **Edge case handling for first 10 citations:** 3-5 hours

**Total: 16-24 hours** with AI assistance. Pays back on every future article forever.
