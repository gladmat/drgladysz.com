---
locale: en
status: locked
version: 1.6
total_photos: 20
active_in_mvp: 12
alternate_in_mvp: 7
archive: 1
---

# Photo manifest — build reference

This file documents which photo goes where on the MVP site. All photos shot at MIRAI Clinic, Otwock; pre-resized JPEGs at 1100px wide are part of the asset delivery.

**File naming convention:** `img-NN.jpg` where NN is the canonical brand reference ID. Use these IDs in component code rather than original filenames.

---

## Site placements (by photo ID)

| ID | Page placement | Component | Notes |
|---|---|---|---|
| `img-12` | **Home — Hero** | `HomeHero` | Under OR lights, no mask. Background-position: center 25%. Aspect ratio 4:5. Filter: saturate(0.96). |
| `img-13` | **All square crops** (LinkedIn, ORCID, OG fallback, social avatar, conference programmes, paper authorship) | n/a (canonical headshot) | Close-up headshot, light blue blazer. Provide variants: 1:1 (200/400/800px), 4:5 vertical, circular. **Do not use as page hero — too tight a crop for hero scale.** |
| `img-14` | **About — Hero** | `AboutHero` | Examination room with anatomical posters. Aspect ratio 4:3. Background-position: center. Also: Google Business Profile primary image, OG image for /about. |
| `img-19` | **About — break before research section** | `PhotoBreak` | Charcoal blazer at French doors, hands at lapels. Aspect ratio 4:5 (tall). Background-position: center 30%. Max-height 90vh. **Also: Bio page hero, publications page header, peer-facing surfaces.** |
| `img-08` | **About — break after sub-specialty** | `PhotoBreak` | Surgical instruments tray, gold + steel handles. Aspect ratio 16:9. Editorial detail. **Also: section dividers across site, publications page header.** |
| `img-02` | **Home — break between specialties and publications** | `PhotoBreak` | Close-up gloved hands holding surgical instruments. Aspect ratio 16:9. **Also: hand surgery procedure pages, section dividers.** |
| `img-11` | **Polish-language pages — sterile-technique pages** (knowledge base header, pre-op patient information) | `PhotoBreak` | Scrub sink with mirror reflection. **CAVEAT: Polish text "MYCIE RĄK / DEZYNFEKCJA RĄK" visible. Restrict to /pl/ pages OR crop frame to remove text for English use.** |

---

## Tier list (build priority)

### Primary tier — used in MVP

These seven do most of the work:

- `img-12` — home hero, OG/Twitter card primary, conference badge photo
- `img-13` — canonical headshot, all square crops, social avatars
- `img-14` — about hero, GMB image, /about OG image
- `img-19` — academic register: bio hero, publications header, peer surfaces
- `img-08` — editorial detail: section dividers, page transitions
- `img-02` — editorial detail: hand surgery pages, microsurgery research
- `img-11` — editorial detail PL only: sterile-technique pages

### Strong supporting tier (5)

Used on internal pages where a primary would feel like over-billing:

- `img-05` — bio "in clinic" block, GMB, consultation/procedure landing
- `img-15` — column/sidebar layouts, blog post headers, mobile hero alternative
- `img-16` — procedure detail page leads, contact page lead, "consultation" landing
- `img-17` — editorial portrait: mid-page accent, philosophy section, "in their own words"
- `img-18` — publications page secondary, CV page lead

### Supporting (treated) tier (3) — surgical context

OR shots requiring color treatment:

- `img-10` — about page secondary block "in clinical practice"
- `img-09` — mid-page editorial accent on procedure pages, sidebar context
- `img-04` — home page secondary visual ("in surgery" block), about page surgical-context anchor

### Alternate tier (4) — A/B test pool

Reserve for marketing campaigns, alternate covers, social rotation:

- `img-01` — outdoor portrait, light blue blazer, white historic building
- `img-06` — charcoal blazer arms crossed, office shutters
- `img-20` — charcoal blazer arms crossed, residential interior
- `img-03` — indoor full-length, light blue blazer, modern wood corridor

### Archive (1) — not used in MVP

- `img-07` — seated waiting room (reads commercial-consultation; not used)

---

## Treatment for OR shots (img-04, img-09, img-10, and partial: img-12)

Required color processing to integrate with cream palette:

```yaml
saturation_teal: -15% to -20% globally
shadow_lift: warm grey, HSL(30°, 5%, 25%)
midtones_temperature: +3 to +5 toward yellow/red
output_color_space: Display P3 if possible, otherwise sRGB
```

**Do not over-grade.** Goal is integration with the brand palette, not a unified color cast.

For portraits (img-05/06/13/14/15/16/17/18/19/20): preserve existing grading. Light treatment only:
- Whites in shirt should not exceed RGB 250 (preserve cream relationship)
- Shadows should not crush below RGB 15

---

## Cropping conventions

```yaml
hero_desktop: 16:9
hero_mobile: 4:5
social_instagram_linkedin: 4:5
avatar_square: 1:1
og_image: 1200×630 (≈1.91:1)
photo_break_inline: 16:9
photo_break_tall: 4:5 (max-height: 90vh)
```

**Portrait cropping rules:**
- Never crop above the eye line
- Never crop the chin
- Preserve at least one full hand width of headroom on heroes

---

## Build pipeline notes

1. **Source files:** 20 high-resolution JPEGs from MIRAI Clinic shoots, 2024-2025. Originals available; pre-resized 1100px-wide JPEGs at quality 78 already produced.

2. **Format optimisation:** Convert to WebP for web delivery (with JPEG fallback). AVIF for portraits if size warrants.

3. **Responsive image sizes:**
   - Mobile (≤767px): 800px wide max
   - Tablet (768-1023px): 1100px wide
   - Desktop (≥1024px): 1320px wide max
   - Retina @ 2x for all sizes

4. **Lazy loading:** All photos below the fold should use `loading="lazy"` and `decoding="async"`.

5. **Alt text:** Every photo requires descriptive alt text. The descriptions in this manifest can serve as a starting point, but tighten for accessibility (e.g. "img-14" alt: "Mateusz Gładysz seated in a clinical examination room with anatomical study illustrations on the wall").

6. **OG image generation:** OG images are generated at build time from photo source files. Each page should have a unique OG image; do not reuse a single OG image across pages.

7. **CDN delivery:** If using Vercel/Cloudflare, push photos through CDN with appropriate cache headers (1 year for hashed filenames). 

---

## Photography gaps for post-MVP

Not blocking launch but would strengthen the system:

1. Hand-specific close-ups (his actual hands, not gloved). Hand surgeon identity asset; currently absent.
2. Reading / research / writing context. Supports academic positioning. img-05 partially fills this.
3. Lecture context. Clean podium shot from a real conference (FESSH Basel, Euromicro Prague, EURAPS Vienna 2026). Not staged.

These are queued for a future shoot; not a launch blocker.
