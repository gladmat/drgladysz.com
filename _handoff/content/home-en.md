---
page: home
locale: en
status: locked
version: 1.6
---

# Home page content (English)

> **Status:** All content locked at v1.6. Polish version pending native composition session before September 2026 launch — do not auto-translate.

This file contains the complete locked content for the English home page (`/en/` → root). Six sections plus footer (footer is in `footer-en.md`). Content is structured for direct consumption by component-based site builders.

---

## Section 1 — Hero

```yaml
section_id: hero
component: HeroBlock
photo: img-12
photo_role: home_hero
photo_position: right
```

### Display name (cover-spread variant)

**Wordmark display:** `Mateusz Gładysz`

**Typography:** Plex Serif Regular 400, ~116px desktop / clamps to mobile, lowercase except initial M and G, `letter-spacing: -0.03em`, `line-height: 0.95`. Two lines: "Mateusz" on line 1, "Gładysz" on line 2.

### Credentials line

`MD · FEBOPRAS · FEBHS`

**Typography:** Plex Mono 400, 16px, `letter-spacing: 0.14em`, color `var(--accent)`, uppercase, sits above the wordmark. Separator is centered middle dot (`·`) with non-breaking spaces.

### Positioning sentence (italic standfirst)

> Surgical care for the hand and reconstructive microsurgery — European double board-certified plastic and hand surgeon, with clinical practice across Switzerland, Germany, Australia, and New Zealand.

**Typography:** Plex Serif Italic 400, 18-22px responsive, `line-height: 1.5`, color `var(--ink-2)`, `max-width: 28ch`, sits below the wordmark.

### Single CTA

**Label:** `Make an appointment`
**Link:** `/contact`
**Style:** Solid button, dark fill (`var(--ink)`), white text, hover transitions to oxblood (`var(--accent)`). Plex Sans Medium 500, 15px, `letter-spacing: 0.02em`. Trailing arrow `→` in Plex Mono.

---

## Section 2 — Standfirst paragraph

```yaml
section_id: standfirst
component: StandfirstBlock
border_top: true
max_width: 760px
```

> My practice covers the operative treatment of the hand and upper extremity, microsurgical reconstruction across the body — including lower-limb orthoplastic care, autologous breast reconstruction, and free-flap reconstruction in head and neck collaboration — and the surgical treatment of melanoma and complex skin cancer, an area I lead at Waikato Hospital as Chair of the Melanoma and High-Risk Skin Cancer MDT. I undertook basic surgical training at the University Hospital of Zurich and plastic surgery specialty training at Hannover Medical School, completed the Perth International Plastic and Reconstructive Fellowship at Sir Charles Gairdner Hospital, completed hand surgery sub-specialty training as Oberarzt within the hand surgery team at Kantonsspital Aarau under Prof. Plock, and currently practise as a consultant at Waikato Hospital in Hamilton, New Zealand. My doctoral research at the University of Zurich addresses clinical applications of artificial intelligence in surgical care.

**Typography:** Plex Serif 400, 18-22px responsive, `line-height: 1.6`, color `var(--ink)`, `max-width: 60ch`. Single paragraph, no internal line breaks.

---

## Section 3 — Three sub-specialty blocks

```yaml
section_id: specialties
component: SpecialtyBlocks
layout: three_column_desktop
section_label: "Areas of practice"
heading: "Three sub-specialty areas"
```

Section label (small caps mono with accent bar): `Areas of practice`
Section heading (h2): `Three sub-specialty areas`

### Block 1

```yaml
heading: "Hand Surgery"
link: /procedures/hand-surgery
```

> Operative care for the hand, wrist, and upper extremity, covering elective conditions and trauma. Common indications include carpal tunnel and other compression neuropathies, scaphoid and other carpal fractures, flexor and extensor tendon injuries, and arthritis of the thumb base. Consultations are available for both acute and chronic presentations.

**CTA:** `Read more →`

### Block 2

```yaml
heading: "Reconstructive & Microsurgery"
link: /procedures/reconstructive-microsurgery
```

> Reconstruction of soft tissue and complex defects following trauma, oncological resection, or chronic disease. Current practice areas include lower-limb orthoplastic reconstruction in collaboration with orthopaedic colleagues, autologous breast reconstruction with DIEP and related perforator flaps, and free-flap reconstruction in head and neck collaboration with ENT and oncological teams.

**CTA:** `Read more →`

### Block 3

```yaml
heading: "Skin Cancer Surgery"
link: /procedures/skin-cancer
```

> Surgical management of melanoma and high-risk non-melanoma skin cancer, including diagnostic excision, wide local excision, sentinel lymph node biopsy, and reconstruction following oncological resection. New Zealand has among the highest incidence rates of melanoma globally; my practice is shaped by this volume and by my role as Chair of the Melanoma and High-Risk Skin Cancer MDT at Waikato Hospital.

**CTA:** `Read more →`

**Block typography:** Each block has 2px top border in `var(--ink)`, h3 in Plex Serif Medium 26px, body in Plex Sans 16px / 1.65 line-height in `var(--ink-2)`. CTA in Plex Sans 14px, oxblood with 1px underline.

---

## Section 4 — Photo break (editorial moment)

```yaml
section_id: photo_break_1
component: PhotoBreak
photo: img-02
aspect_ratio: 16/9
position: between_specialties_and_publications
```

Full-bleed, 16:9 aspect ratio, no text, sits between the sub-specialty blocks and the publications section.

---

## Section 5 — Selected Publications

```yaml
section_id: publications
component: PublicationsTeaser
layout: two_column_cards
section_label: "Research"
heading: "Selected publications"
cta: "All publications →"
cta_link: /publications
```

Section label: `Research`
Section heading (h2): `Selected publications`

### Card 1

```yaml
title: "AI-Assisted Medical Documentation in a Multilingual Swiss Healthcare System"
authors: ["Mateusz Gładysz", "Fabrizio Fiumedinisi", "Felice Burn", "Nikki Rommers", "Pietro Giovanoli", "Jan Alexander Plock"]
authors_bold_index: 0
journal: "JMIR AI"
year: 2026
doi: 10.2196/77351
doi_url: https://doi.org/10.2196/77351
note: "Editorial card title only; full title with subtitle 'A proof-of-concept Study' displays on archive page only"
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

**CTA below cards:** `All publications →` linking to `/publications`

**Card typography:** 1px top border in `var(--rule-strong)`. Title in Plex Serif Medium 20px / 1.35 line-height. Authors in Plex Sans 13px (current author bolded). Journal/year/DOI in Plex Mono 12px.

---

## Section 6 — Selected articles

```yaml
section_id: articles
component: ArticlesTeaser
layout: three_column_cards
section_label: "Knowledge base"
heading: "Selected articles"
cta: "All articles →"
cta_link: /blog
```

Section label: `Knowledge base`
Section heading (h2): `Selected articles`

### Card 1

```yaml
category: "Patient information"
title: "Carpal Tunnel Syndrome: A Patient's Guide"
link: /blog/carpal-tunnel-syndrome
```

> Carpal tunnel syndrome causes numbness, tingling, and pain in the hand when the median nerve is compressed at the wrist. This guide explains how the condition is diagnosed, when surgery is indicated, and what recovery typically involves.

### Card 2

```yaml
category: "Expert blog"
title: "Scaphoid Fractures"
link: /blog/scaphoid-fractures
```

> The scaphoid is the most commonly fractured carpal bone, and missed or inadequately treated fractures are a leading cause of post-traumatic wrist arthritis. A practical overview of diagnosis, classification, and surgical decision-making.

### Card 3

```yaml
category: "Expert blog"
title: "Flexor Tendon Injuries and Repair"
link: /blog/flexor-tendon-injuries-and-repair
```

> Flexor tendon injuries require precise surgical repair, structured rehabilitation, and an understanding of zone-specific anatomy. A review of current technique, suture configuration, and post-operative protocol.

**CTA below cards:** `All articles →` linking to `/blog`

**Card typography:** 1px top border in `var(--rule-strong)`. Category in Plex Mono 10px, oxblood, uppercase, 0.14em tracking. Title in Plex Serif Medium 22px. Body in Plex Sans 15px / 1.6 line-height.

---

## Notes for build

1. **Polish version is NOT a translation of this file.** Native Polish composition pending. Do not pass this content through a translator. The Polish home page will be a separate file (`home-pl.md`) generated from a dedicated composition session.

2. **Photos are referenced by ID** (`img-12`, `img-02`). Photo files are in the brand asset library (separate delivery). The photo manifest in `design/photo-manifest.md` documents what each ID is, where to use it, and treatment notes.

3. **All forbidden components** from the brand spec apply to this page: no testimonials, no before/after carousel, no countdown timers, no scarcity messaging, no patient case galleries (consent workflow deferred to post-MVP), no live chat, no self-quoted volume statistics, no tagline, no three-pillar values blocks.

4. **MCNZ requires abbreviation expansion at first appearance.** The hero's `MD · FEBOPRAS · FEBHS` is the abbreviated form. The first instance of FEBOPRAS in the standfirst should be expanded once, e.g. `Fellow of the European Board of Plastic, Reconstructive and Aesthetic Surgery (FEBOPRAS)`. The brand spec §8 voice rules and the dedicated `/credentials` page handle full credentialing context.
