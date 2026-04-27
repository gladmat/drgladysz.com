---
feature: glossary-system
tier: 2
ships_with: months-1-6
effort_hours: 15-25
maintenance: term-collection-grows-naturally
status: locked
version: 1.7
---

# Feature 5 — Glossary system with dashed-underline tooltips

A glossary collection in Sanity (`glossaryTerm` documents) and an Astro component that renders specific terms in article text with a dashed underline. Hover (desktop) or tap (mobile) reveals a native Popover API tooltip with the definition, an optional short illustration, and a "more" link to the dedicated glossary page at `/en/glossary/[slug]`.

---

## Strategic value

This is the **patient-audience equivalent of the citation system**. It lets a single article serve both audiences — surgeons hover nothing; patients hover everything — without bifurcating content into separate "for patients" and "for clinicians" versions of the same article.

Each glossary term becomes its own indexed URL (`/en/glossary/median-nerve`, `/en/glossary/scaphoid`), capturing long-tail queries like "what is a median nerve" or "co to jest kość łódeczkowata". The Sanity glossary collection grows naturally as articles are written; by year 3, it contains 150-250 entries naturally and is itself a major SEO surface.

---

## How it appears in article text

Article text contains terms marked as glossary references. A reader sees:

> Carpal tunnel syndrome causes numbness, tingling, and pain when the **median nerve** is compressed at the wrist.

Where "median nerve" has a dashed underline indicating it's a glossary term. On desktop hover or mobile tap, a popover appears showing:

```
┌────────────────────────────────────────┐
│ Median nerve                           │
│                                        │
│ One of the three main nerves of the    │
│ arm and hand. It controls movement of  │
│ several muscles in the forearm and     │
│ palm and provides sensation to the     │
│ thumb, index, middle, and half of the  │
│ ring fingers.                          │
│                                        │
│ [Optional: small anatomical diagram]   │
│                                        │
│ More about this term →                 │
└────────────────────────────────────────┘
```

The "More about this term" link goes to `/en/glossary/median-nerve` — a dedicated page that has the full definition, related terms, source citations, and links to articles where the term appears.

---

## Detection approach: explicit marking (not auto-detection)

Two implementation options exist:

**Option A — Explicit marking in editor (chosen for MVP).**
The author wraps the term in a "glossary term" mark when writing. They actively decide which instances become tooltips.

**Option B — Build-time regex pass (deferred to Tier 3).**
Auto-detect known glossary terms in article text. More powerful but produces false positives (e.g., "scale" matches but isn't always the medical scale meaning).

**Why Option A wins for MVP:**
1. **Predictability** — author has control over which instances become tooltips
2. **No false positives** — only marked terms become interactive
3. **No first-mention-only logic needed** — author decides per article whether to mark every instance or just the first
4. **Simpler implementation** — uses standard Portable Text annotation system

If by year 2 the explicit-marking approach feels too heavy, build Option B as enhancement. Don't build it upfront.

---

## Sanity schema — `glossaryTerm.ts`

```typescript
// studio/schemas/glossaryTerm.ts
import { defineType, defineField } from 'sanity';

export const glossaryTerm = defineType({
  name: 'glossaryTerm',
  title: 'Glossary term',
  type: 'document',
  fields: [
    defineField({
      name: 'term',
      title: 'Term (English)',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'The term as it appears (e.g., "median nerve", "scaphoid")',
    }),
    defineField({
      name: 'termPolish',
      title: 'Term (Polish)',
      type: 'string',
      description: 'Polish equivalent if applicable (e.g., "nerw pośrodkowy")',
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      options: { source: 'term', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortDefinition',
      title: 'Short definition (for tooltip)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required().max(400),
      description: 'Brief patient-friendly definition. Max ~400 characters. Shown in popover.',
    }),
    defineField({
      name: 'shortDefinitionPolish',
      title: 'Short definition (Polish)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.max(400),
    }),
    defineField({
      name: 'fullDefinition',
      title: 'Full definition (for glossary page)',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Comprehensive definition shown on the dedicated glossary page',
    }),
    defineField({
      name: 'fullDefinitionPolish',
      title: 'Full definition (Polish)',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Anatomy', value: 'anatomy' },
          { title: 'Condition', value: 'condition' },
          { title: 'Procedure', value: 'procedure' },
          { title: 'Investigation', value: 'investigation' },
          { title: 'Treatment', value: 'treatment' },
          { title: 'Outcome measure', value: 'outcome' },
          { title: 'Anatomical structure', value: 'structure' },
          { title: 'Other', value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'illustration',
      title: 'Illustration (optional)',
      type: 'image',
      options: { hotspot: true },
      fields: [
        { name: 'caption', title: 'Caption', type: 'string' },
        { name: 'alt', title: 'Alt text', type: 'string', validation: (Rule) => Rule.required() },
      ],
      description: 'Small anatomical illustration shown in popover and on full page',
    }),
    defineField({
      name: 'relatedTerms',
      title: 'Related terms',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'glossaryTerm' }] }],
      description: 'Other glossary terms related to this one. Shown as cross-links on glossary page.',
    }),
    defineField({
      name: 'synonyms',
      title: 'Synonyms / alternative spellings',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'Other words for this term (e.g., "scaphoid" might have synonym "navicular bone")',
    }),
  ],
  preview: {
    select: {
      term: 'term',
      termPolish: 'termPolish',
      category: 'category',
    },
    prepare({ term, termPolish, category }) {
      return {
        title: term,
        subtitle: `${category}${termPolish ? ` · PL: ${termPolish}` : ''}`,
      };
    },
  },
});
```

---

## Portable Text mark — glossaryTerm

In article and procedure-page schemas, add the glossary term mark to Portable Text:

```typescript
// In article schema body field
{
  type: 'block',
  marks: {
    annotations: [
      // ... existing annotations (citation, link, etc.)
      {
        name: 'glossaryTerm',
        type: 'object',
        title: 'Glossary term',
        fields: [
          {
            name: 'term',
            type: 'reference',
            to: [{ type: 'glossaryTerm' }],
            validation: (Rule) => Rule.required(),
          },
        ],
      },
    ],
  },
},
```

When the author selects text and applies the glossary mark, they pick a glossary term document. The text becomes interactive at render time.

---

## GlossaryTerm component — `GlossaryTerm.astro`

```astro
---
// src/components/content/GlossaryTerm.astro
interface Props {
  term: any; // Sanity glossaryTerm object
  displayText: string; // The actual text from the article (may differ from canonical term)
  locale: 'en' | 'pl';
}

const { term, displayText, locale } = Astro.props;

const definition = locale === 'pl' && term.shortDefinitionPolish
  ? term.shortDefinitionPolish
  : term.shortDefinition;

const popoverId = `glossary-${term._id}`;
const glossaryUrl = locale === 'en'
  ? `/en/glossary/${term.slug.current}`
  : `/pl/slownik/${term.slug.current}`;
---

<span class="glossary-wrapper">
  <button
    type="button"
    popovertarget={popoverId}
    class="glossary-trigger"
    aria-label={`Definition of ${displayText}`}
  >
    {displayText}
  </button>
  
  <aside
    id={popoverId}
    popover="auto"
    class="glossary-popover"
  >
    <div class="glossary-popover-content">
      <h4 class="glossary-term-name">{term.term}</h4>
      <p class="glossary-definition">{definition}</p>
      
      {term.illustration && (
        <figure class="glossary-illustration">
          <img 
            src={term.illustration.asset.url}
            alt={term.illustration.alt}
            loading="lazy"
          />
          {term.illustration.caption && (
            <figcaption>{term.illustration.caption}</figcaption>
          )}
        </figure>
      )}
      
      <a href={glossaryUrl} class="glossary-more-link">
        More about this term →
      </a>
    </div>
  </aside>
</span>

<style>
  .glossary-wrapper {
    display: inline;
  }
  
  .glossary-trigger {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    cursor: pointer;
    text-decoration: none;
    border-bottom: 1px dashed var(--ink-3);
    padding-bottom: 1px;
    transition: border-color 0.15s;
  }
  
  .glossary-trigger:hover {
    border-bottom-color: var(--accent);
    border-bottom-style: solid;
  }
  
  .glossary-trigger:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 1px;
  }
  
  /* Popover styling */
  .glossary-popover {
    border: 1px solid var(--rule-strong);
    background: var(--bg-card);
    padding: 20px 24px;
    max-width: 360px;
    border-radius: 0;
    box-shadow: 0 8px 24px rgba(20, 23, 26, 0.08);
    margin: 0;
  }
  
  .glossary-popover::backdrop {
    background: rgba(20, 23, 26, 0.04);
  }
  
  .glossary-term-name {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 16px;
    margin: 0 0 12px;
    color: var(--ink);
  }
  
  .glossary-definition {
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink);
    margin: 0 0 16px;
  }
  
  .glossary-illustration {
    margin: 0 0 16px;
  }
  
  .glossary-illustration img {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .glossary-illustration figcaption {
    font-family: var(--sans);
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 4px;
    line-height: 1.4;
    font-style: italic;
  }
  
  .glossary-more-link {
    display: inline-block;
    font-family: var(--sans);
    font-size: 13px;
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1px;
  }
  
  .glossary-more-link:hover {
    color: var(--ink);
    border-bottom-color: var(--ink);
  }
</style>
```

---

## Glossary index page — `/en/glossary/`

Lists all glossary terms grouped alphabetically, with category filter:

```astro
---
// src/pages/en/glossary/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import { getAllGlossaryTerms } from '@/lib/sanity';

const terms = await getAllGlossaryTerms();

// Group by first letter
const grouped = terms.reduce((acc, term) => {
  const letter = term.term.charAt(0).toUpperCase();
  if (!acc[letter]) acc[letter] = [];
  acc[letter].push(term);
  return acc;
}, {} as Record<string, any[]>);

const letters = Object.keys(grouped).sort();
---

<BaseLayout title="Glossary" description="Medical terms used on drgladysz.com, with definitions">
  <article class="glossary-index">
    <h1>Glossary</h1>
    <p class="standfirst">
      Medical terms used in articles and procedure descriptions on this site.
      Each term has a brief definition; click through for fuller context.
    </p>
    
    <nav class="glossary-jump-nav" aria-label="Jump to letter">
      {letters.map(letter => (
        <a href={`#letter-${letter}`}>{letter}</a>
      ))}
    </nav>
    
    {letters.map(letter => (
      <section id={`letter-${letter}`} class="letter-section">
        <h2>{letter}</h2>
        <ul class="terms-list">
          {grouped[letter].map(term => (
            <li class="term-entry">
              <a href={`/en/glossary/${term.slug.current}`}>
                <span class="term-name">{term.term}</span>
                <span class="term-snippet">{term.shortDefinition}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </article>
</BaseLayout>
```

---

## Glossary detail page — `/en/glossary/[slug]`

```astro
---
// src/pages/en/glossary/[slug].astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import { PortableText } from 'astro-portabletext';
import { getGlossaryTermBySlug, getArticlesUsingTerm } from '@/lib/sanity';

const { slug } = Astro.params;
const term = await getGlossaryTermBySlug(slug);
const articlesUsingTerm = await getArticlesUsingTerm(term._id);
---

<BaseLayout
  title={`${term.term} — Glossary`}
  description={term.shortDefinition}
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.shortDefinition,
    inDefinedTermSet: 'https://drgladysz.com/en/glossary/',
  }}
>
  <article class="glossary-detail">
    <header>
      <p class="category">{term.category}</p>
      <h1>{term.term}</h1>
      {term.termPolish && <p class="polish-name">PL: {term.termPolish}</p>}
    </header>
    
    {term.illustration && (
      <figure class="term-illustration">
        <img src={term.illustration.asset.url} alt={term.illustration.alt} />
        {term.illustration.caption && <figcaption>{term.illustration.caption}</figcaption>}
      </figure>
    )}
    
    <section class="full-definition">
      {term.fullDefinition?.length > 0 ? (
        <PortableText value={term.fullDefinition} />
      ) : (
        <p>{term.shortDefinition}</p>
      )}
    </section>
    
    {term.synonyms?.length > 0 && (
      <section class="synonyms">
        <h2>Also known as</h2>
        <ul>
          {term.synonyms.map(s => <li>{s}</li>)}
        </ul>
      </section>
    )}
    
    {term.relatedTerms?.length > 0 && (
      <section class="related-terms">
        <h2>Related terms</h2>
        <ul>
          {term.relatedTerms.map(related => (
            <li>
              <a href={`/en/glossary/${related.slug.current}`}>{related.term}</a>
            </li>
          ))}
        </ul>
      </section>
    )}
    
    {articlesUsingTerm.length > 0 && (
      <section class="articles-using">
        <h2>Articles mentioning this term</h2>
        <ul>
          {articlesUsingTerm.map(article => (
            <li>
              <a href={`/en/blog/${article.slug.current}`}>{article.title}</a>
            </li>
          ))}
        </ul>
      </section>
    )}
    
    <p class="back-link">
      <a href="/en/glossary">← All glossary terms</a>
    </p>
  </article>
</BaseLayout>
```

---

## Schema.org — `DefinedTerm`

Each glossary entry generates a `DefinedTerm` JSON-LD entry. The glossary index page generates a `DefinedTermSet`. This is genuine SEO and LLM signal — both Google and search-augmented LLMs use `DefinedTerm` to surface definitional content.

---

## Polish-language consideration

The glossary supports parallel English/Polish definitions in the same document. The Astro template displays the appropriate language based on the page's locale. Polish terms can have different slugs (e.g., English `/glossary/median-nerve` vs. Polish `/pl/slownik/nerw-posrodkowy`).

For MVP launch with limited Polish content: glossary terms get English definitions immediately, Polish definitions added during the dedicated Polish content composition session before launch.

---

## How term collection grows

Realistic growth trajectory:

- **Launch (Sept 2026):** ~20-30 most common terms (median nerve, ulnar nerve, scaphoid, flexor tendon, extensor tendon, carpal tunnel, etc.)
- **Year 1 (Oct 2027):** ~80-120 terms — each new article suggests 2-5 new terms
- **Year 3 (Oct 2029):** ~150-250 terms — a substantial reference resource on its own

The growth is organic. Don't try to front-load the glossary with hundreds of terms before launch. Add terms as articles need them.

---

## Effort estimate

- **Sanity schema (glossaryTerm):** 2-3 hours
- **Portable Text mark setup:** 1-2 hours
- **GlossaryTerm.astro component:** 4-6 hours
- **Glossary index page:** 3-4 hours
- **Glossary detail page:** 3-4 hours
- **Schema.org JSON-LD:** 1 hour
- **Initial term seeding (20-30 terms):** 4-6 hours (Mateusz authoring, mostly)

**Total infrastructure: 15-25 hours** (not counting term authoring)
