---
component: SiteFooter
locale: en
status: locked
version: 1.6
appears_on: all_pages
---

# Footer content (English)

> **Status:** Locked at v1.6. The footer appears on every page; content is identical across pages with only the EN | PL switcher reflecting the current locale.

Background: `var(--bg-dark)` (#14171A). Text: `rgba(250, 247, 242, 0.85)`. Layout: 4 columns desktop, 2 columns mobile.

---

## Signature line (above columns)

```yaml
component: FooterSignature
```

`Mateusz Gładysz` — Plex Serif Regular 400, italic on "Gładysz", clamp 28-40px.

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

International Member, ASSH
```

> **Note:** WSRM (World Society for Reconstructive Microsurgery) to be added when membership confirms — application in progress April 2026.

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
- [Home](/)
- [About](/about)
- [Procedures](/procedures)
- [Publications](/publications)
- [Contact](/contact)
- [Credentials](/credentials)

(visual gap of 16px)

Legal:
- [Imprint](/imprint)
- [Privacy Policy](/privacy)
- [Medical Disclaimer](/disclaimer)

---

## Disclaimer band (full-width, below columns)

```yaml
component: FooterDisclaimer
border_top: 1px solid rgba(250, 247, 242, 0.1)
```

> The information on this website is provided for general guidance and educational purposes. It does not constitute medical advice and does not replace consultation with a qualified medical practitioner.

Plex Sans 12px, `line-height: 1.6`, color `rgba(250, 247, 242, 0.6)`.

---

## Copyright row (final row)

```yaml
component: FooterCopyright
layout: flex_space_between
```

Left: `© 2026 Mateusz Gładysz. All rights reserved.`
Right: `Aarau Graphite · Set in IBM Plex`

Plex Mono 10px, 0.1em tracking, uppercase, color `rgba(250, 247, 242, 0.5)`.

---

## Polish footer

The Polish footer (`/pl/`) follows identical structure with native-composed Polish content. Polish footer text is locked separately (see brand spec v1.6 §11). Society names use Polish genitive case ("Polskiego Towarzystwa..." after "Członek"). Site nav links use Polish slugs (`Strona główna / O mnie / Zabiegi / Publikacje / Kontakt / Uprawnienia / Nota prawna / Polityka prywatności / Zastrzeżenie medyczne`).

> **Note:** Polish footer content is locked but documented in the brand spec markdown rather than this file. Reference brand spec §11 for full Polish footer text.
