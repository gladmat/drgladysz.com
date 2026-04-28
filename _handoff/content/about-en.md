---
page: about
locale: en
status: locked
content_version: 1.6.2
brand_spec: v1.8
supersedes: v1.6
total_words: 1064
sections: 6
---

# About page content (English)

> **Status:** All content locked at v1.6.2 (April 2026). Polish version pending native composition session before September 2026 launch — do not auto-translate.

This file contains the complete locked content for the English About page (`/en/about/`). Six sections, ~1,064 words.

**v1.6.2 corrections from v1.6:**
- Hero typography: master wordmark Plex Serif **Medium 500** (not cover-spread Regular 400). Both names upright — never italic. The previous "Mateusz upright, Gładysz upright italic 400" guidance is corrected. Web heroes use the master Medium 500 per brand spec §2.
- Hero size clamps and letter-spacing updated to v1.6.2 mockup values.
- Italic-never-on-surname rule made canonical (Decision #5 in v1.8 spec).

---

## Hero / page header

```yaml
component: AboutHero
photo: img-14
photo_role: about_hero
layout: text_left_photo_right
photo_aspect: 4/3
photo_filter: saturate(0.96)
```

### Page label

`About` — small caps IBM Plex Mono 12px, 0.12em tracking, with accent bar.

### H1 (master wordmark)

`Mateusz Gładysz`

**Typography:** IBM Plex Serif **Medium 500** (master wordmark per brand spec §2). `font-size: clamp(40px, 6vw, 72px)` — slightly smaller than home hero, since About has more content competing for attention. `letter-spacing: -0.02em`, `line-height: 1.05`. Lowercase except initial M and G. Both names upright — never italic. Two lines: "Mateusz" line 1, "Gładysz" line 2.

### Lead paragraph (italic standfirst)

> Consultant Plastic and Hand Surgeon at Waikato Hospital, Hamilton — with training across Switzerland, Germany, Australia, and New Zealand.

**Typography:** IBM Plex Serif Italic 400, 18-22px responsive, `line-height: 1.55`, color `var(--ink-2)`.

### Photo

`img-14` (examination room with anatomical posters), aspect ratio 4:3, sits in right column. `filter: saturate(0.96)`.

---

## Section 1 — Opening narrative (no heading)

```yaml
section_id: opening_narrative
component: OpeningNarrative
heading: null
border_top: true
border_bottom: true
max_width: 760px
```

Treatment: framed by border-top and border-bottom, centered single paragraph in larger IBM Plex Serif 400 (clamp 20-26px), with one phrase highlighted in oxblood italic.

> I am a consultant plastic and hand surgeon, currently practising at Waikato Hospital in Hamilton, New Zealand. My training pathway across Switzerland, Germany, Australia, and New Zealand has shaped a clinical practice grounded in microsurgical reconstruction, the operative care of the upper extremity, and the surgical management of melanoma and complex skin cancer. The work I find most demanding — and most worth doing — is balancing what a patient needs, what is surgically possible, and what is pragmatically wise: ***the operation that delivers the right reconstruction is not always the technically maximal one, and the goal is always a patient returning to their life with function intact.***

The bolded sentence at the end renders as `var(--accent)` color (oxblood) and italic. The rest is upright `var(--ink)`.

---

## Section 2 — Sub-specialty training and current focus

```yaml
section_id: sub_specialty
component: AboutSection
section_label: "Practice"
heading: "Sub-specialty training and current focus"
section_number: "§ 02"
```

> After plastic surgery specialty training at Hannover Medical School, my consultant-track training focused on two sub-specialty areas: microsurgical reconstruction and hand surgery. The microsurgical training was the Perth International Plastic and Reconstructive Fellowship at Sir Charles Gairdner Hospital. The hand surgery training came in the years that followed at Kantonsspital Aarau, in the Department of Plastic and Hand Surgery led by Prof. Jan Plock as Chefarzt — though my day-to-day clinical supervision came from PD Dr. Florian Früh as *Leitender Arzt* and Head of Hand Surgery, with whom I continue to consult on complex hand cases. The position was formally Oberarzt, but with daily clinical work concentrated almost entirely within the hand surgery team. In Switzerland, *Handchirurgie* is a sub-specialty separate from plastic surgery, and the Aarau years effectively served as a hand surgery fellowship period. The European Board of Hand Surgery Diploma examination, which requires at least one year of post-specialisation work in a pure hand-surgery scope, followed from that training.

> Current clinical practice draws on both sub-specialties. The principal areas of work are hand surgery and the operative care of the upper extremity, and microsurgical reconstruction across the body. Within reconstructive practice, the surgical management of melanoma and complex skin cancer is a current area of clinical work, anchored by my role as Chair of the Melanoma and High-Risk Skin Cancer MDT at Waikato Hospital.

**Italicised terms:** *Leitender Arzt*, *Handchirurgie* (foreign-language institutional terms; convention applied throughout).

---

## Section 3 — Photo break

```yaml
section_id: photo_break_1
component: PhotoBreak
photo: img-08
aspect_ratio: 16/9
saturate: 0.96
position: between_section_2_and_section_3
```

Full-bleed instruments tray photo (`img-08`), 16:9, no text overlay.

---

## Section 4 — Training and pathway

```yaml
section_id: training_pathway
component: AboutSection
section_label: "Pathway"
heading: "Training and pathway"
section_number: "§ 03"
```

This is the longest section. Six paragraphs, ~416 words.

> I studied medicine at the Medical University of Warsaw between 2008 and 2014, qualifying as *lekarz* in 2014. Postgraduate training began at the Military Institute of Medicine in Warsaw, where I completed the thirteen-month obligatory internship between October 2014 and October 2015.

> Surgical foundation training followed at the University Hospital of Zurich, where I joined the *Surgical Common Trunk* programme in November 2015 under Prof. Pierre-Alain Clavien in the Department of Surgery and Transplantation. The two years in Zurich included rotations in general surgery, emergency medicine, and thoracic surgery, with the Surgical Basic Examination passed in November 2016. After completing the Zurich training in late 2017, I began plastic surgery specialty training at Hannover Medical School in March 2018, following German medical registration.

> The Hannover years were the substantive plastic surgery training period. I worked in the Department of Plastic, Aesthetic, Hand and Reconstructive Surgery under Prof. Peter M. Vogt, across all four sub-specialty areas of European plastic surgery. The European Board examination (FEBOPRAS) was passed in November 2021, and the German *Facharzt* qualification in plastic, reconstructive and aesthetic surgery in June 2022.

> A short observership followed in August 2022 with Prof. Joon Pio Hong at the Asan Medical Center in Seoul. From September 2022 to July 2023, I held the Perth International Plastic and Reconstructive Fellowship at Sir Charles Gairdner Hospital in Western Australia, in the department led by Mr. Remo Papini — though my fellowship coordinator and principal microsurgery teacher was Mr. Duncan Taylor, who remains my microsurgery mentor.

> Returning to Switzerland in October 2023, I joined the Department of Plastic and Hand Surgery at Kantonsspital Aarau as Oberarzt, working primarily within the hand surgery team. The European Board of Hand Surgery Diploma examination (FEBHS) was passed in June 2025, completing the formal credentialing in the second sub-specialty.

> Since September 2025, I have been Senior Medical Officer and Consultant in the Department of Plastic Surgery at Waikato Hospital in Hamilton, New Zealand.

**Italicised terms:** *lekarz*, *Surgical Common Trunk*, *Facharzt*. Plex Serif italic.

---

## Section 5 — Photo break (academic register)

```yaml
section_id: photo_break_2
component: PhotoBreak
photo: img-19
aspect_ratio: 4/5
saturate: 0.96
position: before_section_4
max_height: 90vh
object_position: center 30%
```

Full-bleed `img-19` (charcoal blazer at French doors, hands at lapels), tall format (4:5), `background-position: center 30%` to keep the eye line in frame.

---

## Section 6 — Research and academic work

```yaml
section_id: research
component: AboutSection
section_label: "Research"
heading: "Research and academic work"
section_number: "§ 04"
```

> My doctoral research at the University of Zurich examined AI-assisted clinical documentation in multilingual healthcare settings. The thesis is supervised by Prof. Pietro Giovanoli at UZH as formal *Doktorvater*; the underlying clinical work was conducted at Kantonsspital Aarau under the academic supervision of Prof. Jan Plock, where the AI-scribe systems were developed and evaluated during my time there as Oberarzt. The proof-of-concept study compared four documentation workflows — including ambient AI-assisted dictation — and was particularly interested in how non-native German-speaking clinicians manage documentation burden in a Swiss tertiary hospital. The findings were published in *JMIR AI* in 2026.

> Earlier clinical work during the Hannover years included the European Burn Journal case report on intermediate wound coverage with NovoSorb BTM in persistent *Pseudomonas aeruginosa* infection — a limb-salvage case that illustrated where dermal scaffold templates can extend the reconstructive options in heavily contaminated wounds.

> The selected publications block on the home page lists current peer-reviewed output, and the [publications archive](/en/publications) carries the full record.

**Italicised terms:** *Doktorvater*, *JMIR AI*, *Pseudomonas aeruginosa*. Last paragraph contains internal link to `/en/publications`.

---

## Section 7 — Languages and approach

```yaml
section_id: languages
component: AboutSection
section_label: "Approach"
heading: "Languages and approach"
section_number: "§ 05"
```

> Consultations are conducted in English, Polish, and German. Working in five different healthcare systems — Polish, Swiss, German, Australian, and now New Zealand — has shaped a clinical practice that adapts readily to new environments and structures. The same surgical problem is approached differently in different systems; seeing those differences from the inside, rather than reading about them, makes the underlying judgement more transferable. The questions a patient asks first often tell more than the questions they have prepared, and that observation translates across languages and cultures.

Single paragraph. No internal italics or links.

---

## Section 8 — Outside the operating theatre

```yaml
section_id: personal
component: AboutSection
section_label: "Personal"
heading: "Outside the operating theatre"
section_number: "§ 06"
```

> I am the father of three young children, and most of my non-work life is shaped by them. Indoor rowing on a Concept2 ergometer is a regular morning practice — usually before the rest of the day begins. I am learning piano alongside my children, and continuing language study.

Single short paragraph (55 words).

---

## Notes for build

1. **Section numbering visible in design.** Each substantive section (sub-specialty, training, research, languages, personal) carries a `§ 0n` mono label in oxblood, plus a thematic label (Practice / Pathway / Research / Approach / Personal) in mono uppercase. Brand voice signature throughout the brand book; preserve it in the build.

2. **The supervisor naming pattern.** This page acknowledges formal-supervisor + substantive-supervisor pairs across sections (Plock+Früh, Papini+Taylor, Giovanoli+Plock). Brand voice signature. Do not edit out the dual naming; do not collapse to single supervisor mentions.

3. **Italicised foreign-language terms** appear throughout: `Leitender Arzt`, `Handchirurgie`, `lekarz`, `Surgical Common Trunk`, `Facharzt`, `Doktorvater`, `Pseudomonas aeruginosa`, `JMIR AI`. All Plex Serif italic. Convention is consistent across the page.

4. **No "About" subnavigation needed.** Six-section architecture: keep all sections on one scrollable page with section mastheads (`§ 0n` + label + heading). Do not split into multi-page tabs or accordions.

5. **Three photos used:** `img-14` (hero), `img-08` (break between sub-specialty and training), `img-19` (break before research). All referenced by ID.
