---
locale: en
status: locked
content_version: 1.6.2
brand_spec: v1.8
notes: "Aligned with v1.8 brand spec; no v1.6 → v1.6.2 content changes."
---

# Meta and SEO specifications

This file contains per-page metadata, schema.org JSON-LD markup, social media open graph data, and SEO directives for the MVP launch.

---

## Global meta (applies to all pages)

```yaml
site_name: "Mateusz Gładysz, MD, FEBOPRAS, FEBHS"
default_locale: en-NZ
alternate_locale: pl-PL
canonical_domain: drgladysz.com
twitter_card: summary_large_image
og_type: website
```

### Default OG image

`img-13.jpg` (canonical headshot) cropped to 1200×630 for OpenGraph. Alternative for posts: page-specific photo if available.

### Favicon

MG monogram, square, multiple sizes: 16×16, 32×32, 180×180 (Apple touch icon), 192×192, 512×512 (Android).

### Robots / sitemap

```
robots.txt:
User-agent: *
Allow: /
Sitemap: https://drgladysz.com/sitemap.xml

sitemap.xml: auto-generated, includes all /en/ and /pl/ URLs with hreflang alternates.
```

---

## Home page (/en/)

```yaml
page: home
```

### Title tag
`Mateusz Gładysz, MD, FEBOPRAS, FEBHS — Consultant Plastic and Hand Surgeon`

### Meta description (156 chars)
`Surgical care for the hand and reconstructive microsurgery. European double board-certified plastic and hand surgeon, Waikato Hospital, New Zealand.`

### OG title
`Mateusz Gładysz — Consultant Plastic and Hand Surgeon`

### OG description
`Surgical care for the hand and reconstructive microsurgery. European double board-certified, with clinical practice across Switzerland, Germany, Australia, and New Zealand.`

### OG image
`img-12.jpg` cropped to 1200×630 (under OR lights image, hero photo)

### Schema.org JSON-LD

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MedicalBusiness",
      "@id": "https://drgladysz.com/#business",
      "name": "Mateusz Gładysz, MD",
      "url": "https://drgladysz.com",
      "image": "https://drgladysz.com/img/og-home.jpg",
      "email": "mateusz@drgladysz.com",
      "medicalSpecialty": [
        "PlasticSurgery",
        "Surgery"
      ],
      "knowsAbout": [
        "Hand Surgery",
        "Microsurgical Reconstruction",
        "Melanoma Surgery",
        "Skin Cancer Reconstruction",
        "Upper Extremity Surgery"
      ],
      "founder": {
        "@id": "https://drgladysz.com/#person"
      }
    },
    {
      "@type": "Physician",
      "@id": "https://drgladysz.com/#person",
      "name": "Mateusz Gładysz",
      "honorificPrefix": "Dr",
      "honorificSuffix": "MD, FEBOPRAS, FEBHS",
      "jobTitle": "Consultant Plastic and Hand Surgeon",
      "url": "https://drgladysz.com",
      "image": "https://drgladysz.com/img/headshot.jpg",
      "email": "mateusz@drgladysz.com",
      "worksFor": {
        "@type": "Hospital",
        "name": "Waikato Hospital",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Pembroke Street",
          "addressLocality": "Hamilton",
          "postalCode": "3204",
          "addressCountry": "NZ"
        }
      },
      "alumniOf": [
        {
          "@type": "EducationalOrganization",
          "name": "Medical University of Warsaw"
        },
        {
          "@type": "EducationalOrganization",
          "name": "University Hospital of Zurich"
        },
        {
          "@type": "EducationalOrganization",
          "name": "Hannover Medical School"
        },
        {
          "@type": "Hospital",
          "name": "Sir Charles Gairdner Hospital",
          "description": "Perth International Plastic and Reconstructive Fellowship"
        },
        {
          "@type": "Hospital",
          "name": "Kantonsspital Aarau"
        }
      ],
      "hasCredential": [
        {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "Fellowship",
          "name": "Fellow of the European Board of Plastic, Reconstructive and Aesthetic Surgery (FEBOPRAS)"
        },
        {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "Fellowship",
          "name": "Fellow of the European Board of Hand Surgery (FEBHS)"
        },
        {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "Specialty",
          "name": "Facharzt für Plastische, Rekonstruktive und Ästhetische Chirurgie"
        }
      ],
      "memberOf": [
        {
          "@type": "Organization",
          "name": "Polskie Towarzystwo Chirurgii Plastycznej, Rekonstrukcyjnej i Estetycznej"
        },
        {
          "@type": "Organization",
          "name": "Polskie Towarzystwo Chirurgii Ręki"
        },
        {
          "@type": "Organization",
          "name": "American Society for Surgery of the Hand"
        }
      ],
      "sameAs": [
        "https://orcid.org/0009-0009-2380-4056",
        "https://www.linkedin.com/in/mateuszgladysz"
      ],
      "knowsLanguage": ["en", "pl", "de"]
    },
    {
      "@type": "WebSite",
      "@id": "https://drgladysz.com/#website",
      "url": "https://drgladysz.com",
      "name": "Mateusz Gładysz, MD, FEBOPRAS, FEBHS",
      "publisher": {
        "@id": "https://drgladysz.com/#person"
      },
      "inLanguage": ["en-NZ", "pl-PL"]
    }
  ]
}
```

---

## About page (/en/about/)

```yaml
page: about
```

### Title tag
`About — Mateusz Gładysz, MD, FEBOPRAS, FEBHS`

### Meta description
`Consultant Plastic and Hand Surgeon, currently at Waikato Hospital. Training across the University Hospital of Zurich, Hannover Medical School, Perth, and Kantonsspital Aarau.`

### OG image
`img-14.jpg` cropped to 1200×630 (examination room hero)

### Schema.org

Use the same `Physician` schema as home, but additionally embed it in a `BreadcrumbList`:

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://drgladysz.com/" },
    { "@type": "ListItem", "position": 2, "name": "About", "item": "https://drgladysz.com/about/" }
  ]
}
```

---

## Procedure index page (/en/procedures/)

```yaml
page: procedures_index
```

### Title tag
`Procedures — Mateusz Gładysz, MD`

### Meta description
`Operative care for the hand and upper extremity, microsurgical reconstruction, and surgical management of melanoma and complex skin cancer.`

### OG image
`img-08.jpg` cropped to 1200×630 (instruments tray)

---

## Per-page schema patterns (templates)

### MedicalProcedure (procedure detail pages)

```json
{
  "@type": "MedicalProcedure",
  "name": "[Procedure name]",
  "procedureType": "SurgicalProcedure",
  "bodyLocation": "[anatomy]",
  "preparation": "[brief]",
  "followup": "[brief]",
  "expectedPrognosis": "[brief]",
  "performedBy": {
    "@id": "https://drgladysz.com/#person"
  }
}
```

### MedicalScholarlyArticle (publication entries)

```json
{
  "@type": "MedicalScholarlyArticle",
  "headline": "[paper title]",
  "author": [
    { "@type": "Person", "name": "Mateusz Gładysz" }
  ],
  "isPartOf": {
    "@type": "Periodical",
    "name": "[journal name]"
  },
  "datePublished": "[YYYY-MM-DD]",
  "identifier": [
    { "@type": "PropertyValue", "propertyID": "DOI", "value": "[doi]" }
  ]
}
```

### ContactPage (contact page)

```json
{
  "@type": "ContactPage",
  "name": "Contact — Mateusz Gładysz",
  "primaryImageOfPage": "[contact page image if any]",
  "mainEntity": {
    "@id": "https://drgladysz.com/#person"
  }
}
```

---

## SEO-specific guidance for build

1. **All pages must include `lang` attribute on `<html>`.** `<html lang="en">` for /en/ tree, `<html lang="pl">` for /pl/ tree. Polish content sections inside English pages (e.g. footer society names) marked with inline `<span lang="pl">`.

2. **Hreflang tags required on every page.** Format:
```html
<link rel="alternate" hreflang="en-NZ" href="https://drgladysz.com/en/page" />
<link rel="alternate" hreflang="pl-PL" href="https://drgladysz.com/pl/strona" />
<link rel="alternate" hreflang="x-default" href="https://drgladysz.com/en/page" />
```

3. **Canonical URLs always specified.** No accidental duplication via trailing slash variants. Pick one form (with trailing slash recommended) and 301 the other.

4. **No JavaScript-only content.** All text content must be in initial HTML payload. Critical for both SEO and accessibility. The site is content-heavy and structurally simple; SSR or SSG handles this trivially.

5. **OG images live at `/og/` URL path** as static assets, generated server-side at build time from photo source files. Each page has a unique OG image; do not reuse a single OG image across pages.

6. **Structured data validation:** before launch, run all pages through [Schema.org validator](https://validator.schema.org/) and Google Rich Results Test.

---

## Polish-language SEO

The Polish site (`/pl/`) needs its own meta layer with native-composed content. **Do not auto-translate the English meta into Polish.** Polish meta is generated during the dedicated Polish content composition session.

Slug pattern for Polish pages (locked):
- `/pl/` (home)
- `/pl/o-mnie` (about)
- `/pl/zabiegi/[slug]` (procedures)
- `/pl/publikacje` (publications)
- `/pl/kontakt` (contact)
- `/pl/uprawnienia` (credentials)
- `/pl/nota-prawna` (imprint)
- `/pl/polityka-prywatnosci` (privacy)
- `/pl/zastrzezenie-medyczne` (disclaimer)
- `/pl/zgoda` (consent)
