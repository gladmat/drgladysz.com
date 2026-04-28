---
component: SiteFooter
locale: en
status: locked
content_version: 1.6.2
brand_spec: v1.8
supersedes: v1.6
appears_on: all_pages
---

# Footer content (English)

> **Status:** Locked at v1.6.2 (April 2026). The footer appears on every page; content is identical across pages with only the EN | PL switcher reflecting the current locale.

Background: `var(--bg-dark)` (`#14171A`). Text: `rgba(250, 247, 242, 0.85)`. Layout: 4 columns desktop, 2 columns mobile.

**v1.6.2 corrections from v1.6:**
- Signature treatment corrected: both names upright — **never italic**, per Decision #5 in v1.8 spec ("no italic on the name in any context"). Previous v1.6 directive ("italic on Gładysz") was an error and is rescinded.
- ASSH expanded to "American Society for Surgery of the Hand" per Decision #24 (MCNZ first-mention rule).

---

## Signature line (above columns)

```yaml
component: FooterSignature
```

`Mateusz Gładysz` — IBM Plex Serif **Regular 400**, both names upright (never italic), `clamp 28-40px`. Per brand spec §6 wordmark rules: no italic on the name in any context.

---

## Column 1 — Identity

```yaml
column: 1
heading: "Identity"
```

```
Mateusz Gładysz
MD, FEBOPRAS, FEBHS
Consultant Plastic and
Hand Surgeon

mateusz@drgladysz.com

Consultation languages:
English, Polski, Deutsch
```

---

## Column 2 — Credentials

```yaml
column: 2
heading: "Credentials"
```

```
Medical Council of New Zealand
Registration 93463

Fellow of the European Board of
Plastic, Reconstructive and
Aesthetic Surgery

Fellow of the European Board of
Hand Surgery
```

`Member:` (in small italic, lighter color)

```
Polskie Towarzystwo Chirurgii
Plastycznej, Rekonstrukcyjnej
i Estetycznej

Polskie Towarzystwo Chirurgii Ręki

International Member, American Society for Surgery of the Hand
```

> **Note:** WSRM (World Society for Reconstructive Microsurgery) to be added when membership confirms — application in progress April 2026.

> **MCNZ first-mention rule:** ASSH must be expanded on first appearance per Decision #24. Subsequent uses on the same page may use the abbreviation.

---

## Column 3 — Research

```yaml
column: 3
heading: "Research"
```

- ORCID: [0009-0009-2380-4056](https://orcid.org/0009-0009-2380-4056)
- LinkedIn: [linkedin.com/in/mateuszgladysz](https://www.linkedin.com/in/mateuszgladysz)

---

## Column 4 — Site

```yaml
column: 4
heading: "Site"
```

Site navigation:
- [Home](/en/)
- [About](/en/about)
- [Procedures](/en/procedures)
- [Publications](/en/publications)
- [Contact](/en/contact)
- [Credentials](/en/credentials)

(visual gap of 16px)

Legal:
- [Imprint](/en/imprint)
- [Privacy Policy](/en/privacy)
- [Medical Disclaimer](/en/disclaimer)

---

## Disclaimer band (full-width, below columns)

```yaml
component: FooterDisclaimer
border_top: 1px solid rgba(250, 247, 242, 0.1)
```

> The information on this website is provided for general guidance and educational purposes. It does not constitute medical advice and does not replace consultation with a qualified medical practitioner.

IBM Plex Sans 12px, `line-height: 1.6`, color `rgba(250, 247, 242, 0.6)`.

---

## Copyright row (final row)

```yaml
component: FooterCopyright
layout: flex_space_between
```

Left: `© 2026 Mateusz Gładysz. All rights reserved.`
Right: `Aarau Graphite · Set in IBM Plex`

IBM Plex Mono 10px, 0.1em tracking, uppercase, color `rgba(250, 247, 242, 0.5)`.

---

## Polish footer

The Polish footer (`/pl/`) follows identical structure with native-composed Polish content. Polish footer text is locked separately. Society names use Polish genitive case ("Polskiego Towarzystwa..." after "Członek"). Site nav links use Polish slugs (`Strona główna / O mnie / Zabiegi / Publikacje / Kontakt / Uprawnienia / Nota prawna / Polityka prywatności / Zastrzeżenie medyczne`).

> **Note:** ASSH expansion on the Polish footer should match: "Międzynarodowy członek American Society for Surgery of the Hand" or equivalent, with the English society name retained per Polish-language convention for international affiliations.
