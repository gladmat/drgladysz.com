---
page: home
locale: en
status: locked
content_version: 1.6.2
brand_spec: v1.8
supersedes: v1.6
---

# Home page content (English)

> **Status:** All content locked at v1.6.2 (April 2026). Polish version pending native composition session before September 2026 launch — do not auto-translate.

This file contains the complete locked content for the English home page (`/en/` → root). Six sections plus footer (footer is in `footer-en.md`).

**v1.6.2 corrections from v1.6:**
- Hero typography: master wordmark Plex Serif **Medium 500** (not cover-spread Regular 400). Cover-spread variant is reserved for brand-book covers, document title pages, slide title slides per brand spec §2 ("Where the master Medium 500 wordmark applies. Hero blocks on web pages.").
- Hero size clamps and letter-spacing updated to v1.6.2 mockup values.
- ASSH abbreviation expanded on first appearance (footer) per Decision #24.
- Italic-never-on-surname rule made canonical across all surfaces (Decision #5 in v1.8 spec).

---

## Section 1 — Hero

```yaml
section_id: hero
component: HomeHero
photo: img-12
photo_role: home_hero
photo_position: right
photo_aspect: 4/5
photo_filter: saturate(0.96)
photo_object_position: center 25%
```

### Display name (master wordmark)

**Wordmark display:** `Mateusz Gładysz`

**Typography:** IBM Plex Serif **Medium 500** (master wordmark per brand spec §2). `font-size: clamp(48px, 7.5vw, 96px)`, `letter-spacing: -0.02em`, `line-height: 1.0`. Lowercase except initial M and G. Both names upright — never italic. Two lines: "Mateusz" line 1, "Gładysz" line 2.

### Credentials line (above the wordmark)

`MD · FEBOPRAS · FEBHS`

**Typography:** IBM Plex Mono 400, 16px, `letter-spacing: 0.14em`, color `var(--accent)` (oxblood `#5C2E2E`), uppercase. Separator is centered middle dot (`·`) with non-breaking spaces on either side.

### Positioning sentence (italic standfirst)

> Surgical care for the hand and reconstructive microsurgery — European double board-certified plastic and hand surgeon, with clinical practice across Switzerland, Germany, Australia, and New Zealand.

**Typography:** IBM Plex Serif Italic 400, 18-22px responsive, `line-height: 1.5`, color `var(--ink-2)` (`#3D434A`), `max-width: 28ch`. Sits below the wordmark.

### Single CTA

**Label:** `Make an appointment`
**Link:** `/en/contact`
**Style:** Solid button, dark fill `var(--ink)` (`#14171A`), white text, hover transitions to oxblood `var(--accent)`. IBM Plex Sans Medium 500, 15px, `letter-spacing: 0.02em`. Trailing arrow `→` in IBM Plex Mono.

---

## Section 2 — Standfirst paragraph

```yaml
section_id: standfirst
component: Standfirst
border_top: true
max_width: 760px
```

> My practice covers the operative treatment of the hand and upper extremity, microsurgical reconstruction across the body — including lower-limb orthoplastic care, autologous breast reconstruction, and free-flap reconstruction in head and neck collaboration — and the surgical treatment of melanoma and complex skin cancer, an area I lead at Waikato Hospital as Chair of the Melanoma and High-Risk Skin Cancer MDT. I undertook basic surgical training at the University Hospital of Zurich and plastic surgery specialty training at Hannover Medical School, completed the Perth International Plastic and Reconstructive Fellowship at Sir Charles Gairdner Hospital, completed hand surgery sub-specialty training as Oberarzt within the hand surgery team at Kantonsspital Aarau under Prof. Plock, and currently practise as a consultant at Waikato Hospital in Hamilton, New Zealand. My doctoral research at the University of Zurich addresses clinical applications of artificial intelligence in surgical care.

**Typography:** IBM Plex Serif 400, 18-22px responsive, `line-height: 1.6`, color `var(--ink)` (`#14171A`), `max-width: 60ch`. Single paragraph, no internal line breaks. Sits on a single border-top rule.

**Word count:** 148 words. Locked.

---

## Section 3 — Three sub-specialty blocks

```yaml
section_id: specialties
component: SpecialtyBlocks
layout: three_column_desktop
section_label: "Areas of practice"
heading: "Three sub-specialty areas"
```

### Block 1

```yaml
heading: "Hand Surgery"
link: /en/procedures/hand-surgery
```

> Operative care for the hand, wrist, and upper extremity, covering elective conditions and trauma. Common indications include carpal tunnel and other compression neuropathies, scaphoid and other carpal fractures, flexor and extensor tendon injuries, and arthritis of the thumb base. Consultations are available for both acute and chronic presentations.

**CTA:** `Read more →`

### Block 2

```yaml
heading: "Reconstructive & Microsurgery"
link: /en/procedures/reconstructive-microsurgery
```

> Reconstruction of soft tissue and complex defects following trauma, oncological resection, or chronic disease. Current practice areas include lower-limb orthoplastic reconstruction in collaboration with orthopaedic colleagues, autologous breast reconstruction with DIEP and related perforator flaps, and free-flap reconstruction in head and neck collaboration with ENT and oncological teams.

**CTA:** `Read more →`

### Block 3

```yaml
heading: "Skin Cancer Surgery"
link: /en/procedures/skin-cancer
```

> Surgical management of melanoma and high-risk non-melanoma skin cancer, including diagnostic excision, wide local excision, sentinel lymph node biopsy, and reconstruction following oncological resection. New Zealand has among the highest incidence rates of melanoma globally; my practice is shaped by this volume and by my role as Chair of the Melanoma and High-Risk Skin Cancer MDT at Waikato Hospital.

**CTA:** `Read more →`

**Block typography:** Each block has 2px top border in primary ink, h3 in IBM Plex Serif Medium 26px, body in IBM Plex Sans 16px / 1.65 line-height in `var(--ink-2)`. CTA in IBM Plex Sans 14px, oxblood with 1px underline.

---

## Section 4 — Photo break (editorial moment)

```yaml
section_id: photo_break_1
component: PhotoBreak
photo: img-02
aspect_ratio: 16/9
saturate: 0.96
position: between_specialties_and_publications
```

Full-bleed 16:9, no text overlay, sits between the sub-specialty blocks and the publications section.

---

## Section 5 — Selected publications

```yaml
section_id: publications
component: PublicationsTeaser
layout: two_column_cards
section_label: "Research"
heading: "Selected publications"
cta: "All publications →"
cta_link: /en/publications
```

### Card 1

```yaml
title: "AI-Assisted Medical Documentation in a Multilingual Swiss Healthcare System"
authors: ["Mateusz Gładysz", "Fabrizio Fiumedinisi", "Felice Burn", "Nikki Rommers", "Pietro Giovanoli", "Jan Alexander Plock"]
authors_bold_index: 0
journal: "JMIR AI"
year: 2026
doi: 10.2196/77351
doi_url: https://doi.org/10.2196/77351
note: "Editorial card title only; full title with subtitle 'A Proof-of-Concept Study' displays on archive page only"
```

### Card 2

```yaml
title: "Limb Salvage with Acellular Dermal Matrix Template in Persistent *Pseudomonas aeruginosa* Burn Infection"
authors: ["Mateusz Gładysz", "Vincent März", "Stefan Ruemke", "Evgenii Rubalskii", "Peter Maria Vogt", "Nicco Krezdorn"]
authors_bold_index: 0
journal: "European Burn Journal"
year: 2022
doi: 10.3390/ebj3010004
doi_url: https://doi.org/10.3390/ebj3010004
note: "Editorial card title; *Pseudomonas aeruginosa* italicised per binomial nomenclature convention. Full original title 'Limb Salvage through Intermediary Wound Coverage with Acellular Dermal Matrix Template after Persistent Pseudomonas Aeruginosa Infection in a Burn Patient' displays on archive page only"
```

**CTA below cards:** `All publications →` linking to `/en/publications`

**Card typography:** 1px top border in `var(--rule-strong)` (`#C9C0B0`). Title in IBM Plex Serif Medium 20px / 1.35 line-height. Authors in IBM Plex Sans 13px (current author bolded). Journal/year/DOI in IBM Plex Mono 12px.

---

## Section 6 — Selected articles

```yaml
section_id: articles
component: ArticlesTeaser
layout: three_column_cards
section_label: "Knowledge base"
heading: "Selected articles"
cta: "All articles →"
cta_link: /en/blog
```

### Card 1

```yaml
category: "Patient information"
title: "Carpal Tunnel Syndrome: A Patient's Guide"
link: /en/blog/carpal-tunnel-syndrome
```

> Carpal tunnel syndrome causes numbness, tingling, and pain in the hand when the median nerve is compressed at the wrist. This guide explains how the condition is diagnosed, when surgery is indicated, and what recovery typically involves.

### Card 2

```yaml
category: "Expert blog"
title: "Scaphoid Fractures"
link: /en/blog/scaphoid-fractures
```

> The scaphoid is the most commonly fractured carpal bone, and missed or inadequately treated fractures are a leading cause of post-traumatic wrist arthritis. A practical overview of diagnosis, classification, and surgical decision-making.

### Card 3

```yaml
category: "Expert blog"
title: "Flexor Tendon Injuries and Repair"
link: /en/blog/flexor-tendon-injuries-and-repair
```

> Flexor tendon injuries require precise surgical repair, structured rehabilitation, and an understanding of zone-specific anatomy. A review of current technique, suture configuration, and post-operative protocol.

**CTA below cards:** `All articles →` linking to `/en/blog`

**Polish version:** show only Card 1 (Zespół cieśni nadgarstka), with two empty slots until additional Polish content is composed for launch. Native composition pending.

**Card typography:** 1px top border in `var(--rule-strong)`. Category in IBM Plex Mono 10px, oxblood, uppercase, 0.14em tracking. Title in IBM Plex Serif Medium 22px. Body in IBM Plex Sans 15px / 1.6 line-height.

---

## Notes for build

1. **Polish version is NOT a translation of this file.** Native Polish composition pending. Do not pass this content through a translator. The Polish home page will be a separate file (`home-pl.md`) generated from a dedicated composition session.

2. **Photos are referenced by ID** (`img-12`, `img-02`). Photo files are in the brand asset library. The photo manifest in `_handoff/design/photo-manifest.md` documents what each ID is, where to use it, and treatment notes.

3. **All forbidden components** from the brand spec apply: no testimonials, no before/after carousel, no countdown timers, no scarcity messaging, no patient case galleries, no live chat, no self-quoted volume statistics, no tagline, no three-pillar values blocks.

4. **MCNZ first-mention rule.** The hero's `MD · FEBOPRAS · FEBHS` is the abbreviated form. The first instance of FEBOPRAS in the standfirst should ideally be expanded once. The dedicated `/en/credentials` page handles full credentialing context.
