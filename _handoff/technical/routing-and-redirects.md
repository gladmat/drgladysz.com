---
status: locked
version: 1.7
---

# Routing, redirects, and URL structure

This document specifies all URL conventions, locale routing, redirects from the existing WordPress site, and the canonical URL strategy.

---

## Locale routing strategy

Astro App Router with explicit `/en/` and `/pl/` directory groups under `src/pages/`. Each group has parallel pages with translated slugs.

### Why explicit `/en/` not bare `/`

Two-locale sites have a choice: locale prefix on both (`/en/about`, `/pl/o-mnie`) or default-locale-bare (`/about`, `/pl/o-mnie`). We use **explicit prefix on both**. Reasons:

1. **Symmetric clarity** — search engines and users can see locale unambiguously from the URL
2. **Cleaner hreflang** — every page has a clear locale identifier
3. **No SEO risk from canonical confusion** — bare default-locale URLs sometimes get indexed alongside locale-prefixed variants, splitting page authority
4. **Easier to add a third locale later** if German ever activates

Root `/` redirects to `/en/` (default) or `/pl/` (Polish browser detected via `Accept-Language` header).

---

## Complete URL map

### English tree (`/en/*`)

| URL | Page | Purpose |
|---|---|---|
| `/en/` | Home | Landing page |
| `/en/about` | About | Bio + credentials |
| `/en/procedures` | Procedure index | Lists three categories |
| `/en/procedures/hand-surgery` | Hand surgery landing | Lists Tier-1 procedures |
| `/en/procedures/reconstructive-microsurgery` | Reconstructive landing | Microsurgery + DIEP + ortho-plastic |
| `/en/procedures/skin-cancer` | Skin cancer landing | Melanoma + non-melanoma reconstruction |
| `/en/procedures/[slug]` | Procedure detail | 6 MVP detail pages |
| `/en/publications` | Publications archive | Full peer-reviewed record |
| `/en/contact` | Contact | Email form + practice context |
| `/en/credentials` | Credentials/glossary | FEBOPRAS, FEBHS, MD, etc. explained |
| `/en/calculators` | Calculator suite index | Tier 2 build, post-launch |
| `/en/calculators/[slug]` | Individual calculator | QuickDASH, PRWE, etc. |
| `/en/glossary` | Glossary index | Tier 2 build, post-launch |
| `/en/glossary/[slug]` | Glossary entry page | Each term has own URL |
| `/en/learn` | FEBHS prep landing | Tier 2 build |
| `/en/learn/progress` | MCQ progress dashboard | localStorage-backed |
| `/en/imprint` | Imprint | Legal identity |
| `/en/privacy` | Privacy policy | RODO + NZ Privacy Act |
| `/en/disclaimer` | Medical disclaimer | General-info disclosure |
| `/en/blog` | Blog index | Articles list |
| `/en/blog/[slug]` | Blog post | Long-form articles |

### Polish tree (`/pl/*`)

| URL | Page |
|---|---|
| `/pl/` | Strona główna |
| `/pl/o-mnie` | O mnie |
| `/pl/zabiegi` | Zabiegi |
| `/pl/zabiegi/chirurgia-reki` | Chirurgia ręki |
| `/pl/zabiegi/mikrochirurgia-rekonstrukcyjna` | Mikrochirurgia rekonstrukcyjna |
| `/pl/zabiegi/nowotwory-skory` | Nowotwory skóry |
| `/pl/zabiegi/[slug]` | Zabieg (szczegóły) |
| `/pl/publikacje` | Publikacje |
| `/pl/kontakt` | Kontakt |
| `/pl/uprawnienia` | Uprawnienia |
| `/pl/kalkulatory` | Kalkulatory |
| `/pl/kalkulatory/[slug]` | Kalkulator |
| `/pl/slownik` | Słownik |
| `/pl/slownik/[slug]` | Wpis ze słownika |
| `/pl/nauka` | Nauka (post-MVP) |
| `/pl/nota-prawna` | Nota prawna |
| `/pl/polityka-prywatnosci` | Polityka prywatności |
| `/pl/zastrzezenie-medyczne` | Zastrzeżenie medyczne |
| `/pl/blog` | Blog |
| `/pl/blog/[slug]` | Wpis blogowy |

---

## 301 redirects from existing WordPress site

These are **locked** — every legacy URL must redirect to its new home, or 410 if no equivalent.

### Astro implementation

In `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  redirects: {
    // English content
    '/about/': '/en/about',
    '/blog/': '/en/blog',
    '/extensor-tendon-injuries/': '/en/blog/extensor-tendon-injuries',
    '/scaphoid-fractures/': '/en/blog/scaphoid-fractures',
    '/flexor-tendon-injuries-and-repair/': '/en/blog/flexor-tendon-injuries-and-repair',
    '/carpal-tunnel-syndrome-doctors-explanation/': '/en/blog/carpal-tunnel-syndrome',
    '/homepage/contact/': '/en/contact',
    
    // Polish content
    '/zespol-ciesni-nadgarstka/': '/pl/blog/zespol-ciesni-nadgarstka',
    
    // Common WordPress paths that should land somewhere reasonable
    '/wp-content/': '/en/',
    '/feed/': '/en/blog',
    '/sitemap_index.xml': '/sitemap-index.xml',
  },
});
```

### 410 Gone for legacy paths

WordPress generates a lot of paths that should not redirect to anything (date archives, tag pages, attachment pages, etc.). Use Astro middleware to return 410:

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

// Patterns that indicate legacy WordPress URL structure
const LEGACY_PATTERNS = [
  /^\/20\d{2}\//,           // Year archives: /2023/, /2024/
  /^\/category\//,          // Category pages
  /^\/tag\//,               // Tag pages
  /^\/author\//,            // Author archives
  /^\/wp-login/,            // Admin attempts
  /^\/wp-admin/,
  /^\/xmlrpc\.php/,
  /^\/.*\?p=\d+$/,          // WordPress preview URLs
];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  
  // Skip if it's a known route or static asset
  if (url.pathname.startsWith('/_astro/') || 
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/img/') ||
      url.pathname.startsWith('/fonts/')) {
    return next();
  }
  
  // Check for legacy patterns
  if (LEGACY_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return new Response('Gone', { 
      status: 410,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  return next();
});
```

### Verification

Before launch, test every legacy URL pattern:

```bash
# Run from local terminal against staging
curl -I https://drgladysz-staging.vercel.app/about/
# Expected: HTTP/2 301, location: /en/about

curl -I https://drgladysz-staging.vercel.app/2023/something/
# Expected: HTTP/2 410

curl -I https://drgladysz-staging.vercel.app/wp-admin/
# Expected: HTTP/2 410
```

Run a full crawl of the existing WordPress site (Screaming Frog or similar) before cutover, get the list of all currently-indexed URLs, verify each one redirects correctly or 410s.

---

## Canonical URLs

Every page has a canonical URL specified in the `<head>`:

```html
<link rel="canonical" href="https://drgladysz.com/en/about" />
```

Trailing slash policy: **no trailing slash on content pages**. The canonical form for an article is `/en/blog/scaphoid-fractures` not `/en/blog/scaphoid-fractures/`. Astro respects this by default when using the App Router structure.

If both forms accidentally get indexed, fix by configuring redirect at Vercel level:

```javascript
// vercel.json (only if needed; usually Astro handles this)
{
  "trailingSlash": false
}
```

---

## hreflang tags (mandatory on every page)

```html
<!-- On /en/about -->
<link rel="alternate" hreflang="en-NZ" href="https://drgladysz.com/en/about" />
<link rel="alternate" hreflang="pl-PL" href="https://drgladysz.com/pl/o-mnie" />
<link rel="alternate" hreflang="x-default" href="https://drgladysz.com/en/about" />
```

Implement via a layout component that maps current page to its locale alternate. The page's frontmatter declares the alternate slug:

```typescript
// src/lib/i18n.ts
export const ALTERNATES = {
  '/en/about': '/pl/o-mnie',
  '/en/procedures': '/pl/zabiegi',
  '/en/procedures/hand-surgery': '/pl/zabiegi/chirurgia-reki',
  // ... full mapping
};
```

---

## Sitemap

Astro generates `/sitemap-index.xml` and `/sitemap-0.xml` automatically via `@astrojs/sitemap` integration.

```javascript
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://drgladysz.com',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-NZ', pl: 'pl-PL' },
      },
    }),
  ],
});
```

Submit the sitemap to Google Search Console immediately after launch.

---

## robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /studio/
Disallow: /_astro/

Sitemap: https://drgladysz.com/sitemap-index.xml
```

The `/studio/` route (Sanity Studio) is locked behind authentication but blocking crawlers explicitly is good defense.
