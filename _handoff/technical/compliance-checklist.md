---
status: locked
version: 1.6
applies_to: all_pages
jurisdictions: NZ, PL, EU
---

# Compliance checklist

This file extracts the compliance constraints from the brand spec into a checklist usable during build and pre-launch QA. Build to the **stricter** of NZ MCNZ + Polish KEL Article 71 + RODO + 2023 device-advertising rules. The same surface is then compliant in both jurisdictions automatically.

> **Status:** Best-effort defensible drafting at MVP launch. Formal lawyer review (Polish + NZ) within 18 months, deadline October 2027 before Polish practice activation. Imprint, Privacy Policy, and Medical Disclaimer pages must be live by September 2026 launch but are flagged for legal review as part of post-launch refinement.

---

## Forbidden across all pages 🔒

These are the patterns the brand spec deprecated. Build phase must verify their absence.

- [ ] **No testimonial blocks of any kind.** Patient testimonials, peer testimonials, quote cards, "what people say" sections. NZ MCNZ s.13 prohibits; PL high-risk; AU outright bans.
- [ ] **No before/after carousel** on patient-facing pages. PL high-risk.
- [ ] **No "Book now" countdown timers, scarcity messaging, promotional banners** ("first consultation free", "limited spots").
- [ ] **No patient case galleries** without separate written consent and image-consent workflow. Consent workflow deferred to post-MVP.
- [ ] **No newsletter signup with lead-magnet language.** Newsletters fine if implemented; copy must be informational, not promotional.
- [ ] **No live chat widgets, SaaS chatbots.** Patient-medical context inappropriate.
- [ ] **No self-quoted volume statistics** ("500+ operations", "10+ years experience"). Polish KEL flag.
- [ ] **No tagline/slogan.** Credentials line is the tagline.
- [ ] **No three-pillar values blocks with icons.** Generic and stale.
- [ ] **No logo soup** of medical society memberships (ASSH, ISAPS, PTChPRiE, EBOPRAS logos in a row). Display freely as TEXT only — never as logos.

---

## Forbidden visual elements

- [ ] No medical navy / cobalt blue palette
- [ ] No gold or champagne accents
- [ ] No true black `#000000` (use `#14171A`)
- [ ] No saturated red / orange / yellow
- [ ] No gradients
- [ ] No drop shadows
- [ ] No decorative flourishes
- [ ] No literal medical iconography (caduceus, scalpel, syringe, heart, anatomy)
- [ ] No emoji anywhere (including in copy)
- [ ] No filled-shape iconography
- [ ] No carousel on the home page
- [ ] No auto-playing video
- [ ] No animated counters
- [ ] No parallax effects, no scroll hijacking

---

## Forbidden voice patterns

- [ ] No superlatives ("best", "leading", "world-class", "premier")
- [ ] No comparative claims ("better than", "more advanced than")
- [ ] No urgency framing ("limited availability", "act now", "don't wait")
- [ ] No promotional offers
- [ ] No transformation narratives ("transform your life", "change how you feel")
- [ ] No wellness-spa register ("your journey", "wellness", "vibrant")
- [ ] No informal "Ty" in Polish
- [ ] No "Book now", "Get started", "Click here", "Learn more!"

---

## Required compliance content

### Imprint / Nota prawna (post-MVP lawyer review)

Both `/imprint` (EN) and `/pl/nota-prawna` (PL) must contain:

- Full legal name, MD title, professional credentials
- Email contact
- Current professional registration (NZ MCNZ 93463; Polish PWZ 2985148; German registration; Swiss GLN)
- Jurisdictional note: "Currently practising at Waikato Hospital, Hamilton, New Zealand"
- Reference to professional regulators (Medical Council of New Zealand; Naczelna Izba Lekarska)
- Note about applicable jurisdictions for both NZ and Polish patients

### Privacy Policy / Polityka prywatności (post-MVP lawyer review)

Both `/privacy` (EN) and `/pl/polityka-prywatnosci` (PL) must contain:

- Identity of data controller (Mateusz Gładysz)
- Categories of data collected (form submissions only at MVP; analytics is cookie-free)
- Purposes of processing
- Legal bases under RODO + NZ Privacy Act 2020 + Health Information Privacy Code 2020
- Data retention periods
- Data subject rights:
  - Access, rectification, erasure, restriction, portability, objection (RODO)
  - Access, correction (NZ Privacy Act)
- How to exercise rights (email mateusz@drgladysz.com)
- Right to lodge complaint:
  - UODO (Polish DPA) for EU subjects
  - Office of the Privacy Commissioner (NZ) for NZ subjects
- Plausible analytics disclosure (cookie-free, EU-hosted, no personal data)
- Hosting disclosure (Vercel — note CDN edge nodes, EU edge primary)
- Cross-border data transfer notes for any third-party services

### Medical Disclaimer / Zastrzeżenie medyczne

Both `/disclaimer` (EN) and `/pl/zastrzezenie-medyczne` (PL):

**EN (locked):**
> The information on this website is provided for general guidance and educational purposes. It does not constitute medical advice and does not replace consultation with a qualified medical professional. Surgical outcomes depend on factors specific to each patient and cannot be guaranteed.

**PL (locked):**
> Informacje zawarte na tej stronie mają charakter ogólny i edukacyjny. Nie stanowią porady medycznej i nie zastępują konsultacji z wykwalifikowanym specjalistą. Wyniki leczenia zależą od indywidualnych czynników pacjenta i nie mogą być gwarantowane.

Footer band on every page carries a shorter version (locked):
> The information on this website is provided for general guidance and educational purposes. It does not constitute medical advice and does not replace consultation with a qualified medical practitioner.

### Credentials page / Uprawnienia

Both `/credentials` (EN) and `/pl/uprawnienia` (PL):

- Explain MD (Polish "lekarz" qualification)
- Explain Facharzt (German specialty board certification)
- Explain FEBOPRAS (Fellow of the European Board of Plastic, Reconstructive and Aesthetic Surgery)
- Explain FEBHS (Fellow of the European Board of Hand Surgery)
- Explain MCNZ vocational scope (NZ medical registration)
- Explain Polish PWZ
- Explain Swiss GLN (medical practitioner identifier)
- Link to public registers where verification is possible (EBOPRAS Fellows directory, MCNZ register, NIL register)

This page is footer-linked alongside Imprint / Privacy / Disclaimer.

---

## NZ-specific (MCNZ Statement on Advertising)

- [ ] Abbreviations expanded at first appearance on every page (MCNZ requirement).  
  - First mention: "Fellow of the European Board of Plastic, Reconstructive and Aesthetic Surgery (FEBOPRAS)"  
  - Subsequent mentions: "FEBOPRAS"
- [ ] No claims that imply unique qualifications when shared with other practitioners.
- [ ] All testimonials avoided (s.13 prohibition).
- [ ] Patient identification information (case examples, photos) requires written consent — workflow deferred post-MVP.
- [ ] No misleading or deceptive advertising.

## Polish-specific (KEL Article 71, effective 1 January 2025)

- [ ] No prohibited "promotional" content in patient communication.
- [ ] No volume statistics or comparative claims.
- [ ] No "transformation" framing.
- [ ] Polish patient-facing voice: neutral institutional ("Niniejszy artykuł wyjaśnia...") not direct second-person formal "Pan/Pani".
- [ ] Logos of medical societies (PTChPRiE, PTChR, ASSH, etc.) must NOT appear; text mentions only.
- [ ] Imprint (Nota prawna) on /pl/ tree from MVP launch.

## EU-specific (RODO / GDPR)

- [ ] Cookie-free analytics (Plausible) → no consent banner required.
- [ ] If any cookies are added later (e.g. paid-acquisition pixels), CMP banner with proper consent flow becomes required.
- [ ] EU-resident hosting once Polish patient data is processed (post-2027 transition).
- [ ] Photography consent decoupled from treatment consent (separate forms when patient images activate post-MVP).
- [ ] Image-consent withdrawal mechanism required before any patient image goes live.

## Cross-cutting

- [ ] HTTPS enforced (Vercel automatic).
- [ ] Forms over HTTPS only.
- [ ] No PII passed in URL parameters.
- [ ] Robots.txt allows indexing of all public pages.
- [ ] Sitemap.xml includes all locale variants with hreflang.
- [ ] `lang` attribute set correctly on `<html>` tags (en for /en/ tree, pl for /pl/ tree).
- [ ] Polish content within English pages (footer society names) marked with `<span lang="pl">`.

---

## Pre-launch QA checklist

### Compliance
- [ ] All legal pages live: Imprint, Privacy, Disclaimer, Credentials
- [ ] Imprint contains required identifying information for both jurisdictions
- [ ] Privacy policy covers both RODO and NZ Privacy Act
- [ ] Medical disclaimer band visible in footer on every page
- [ ] No forbidden components present (run through component audit)
- [ ] No forbidden voice patterns present (run through copy audit)
- [ ] All abbreviations expanded at first appearance

### Technical
- [ ] All pages return 200 OK
- [ ] All locked 301 redirects working from old WordPress URLs
- [ ] Performance budgets met (LCP, CLS, INP)
- [ ] All images optimised (WebP/AVIF with JPEG fallback)
- [ ] Schema.org JSON-LD validates on every page (run through Schema.org validator + Google Rich Results test)
- [ ] hreflang tags correct on every page
- [ ] Sitemap.xml accessible at /sitemap.xml
- [ ] Robots.txt accessible at /robots.txt
- [ ] HTTPS enforced, HTTP redirects to HTTPS
- [ ] HSTS header set
- [ ] CSP header set (strict)
- [ ] Contact form submission tested

### Accessibility
- [ ] WCAG 2.1 AA verified (automated audit via axe / Lighthouse)
- [ ] Manual keyboard navigation test passed
- [ ] Screen reader test passed (NVDA + VoiceOver)
- [ ] All images have descriptive alt text
- [ ] All interactive elements have visible focus state
- [ ] Skip-to-content link present

### Content
- [ ] All locked content matches brand spec §11 (home) and §12 (about)
- [ ] No Polish content displayed at MVP launch except locked items (one blog post + footer + legal pages once composed)
- [ ] All forbidden content patterns verified absent
- [ ] OG images present and unique per page
- [ ] Page titles and meta descriptions match SEO spec
- [ ] All photos correctly attributed by ID per photo manifest

### Cross-browser / device
- [ ] Tested on Chrome, Firefox, Safari (latest)
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Tablet layout verified
- [ ] Mobile layout verified
- [ ] Print stylesheet works

---

## Post-launch monitoring

- [ ] Plausible analytics configured and reporting
- [ ] 404 monitoring set up (Vercel logs)
- [ ] Search Console set up for both /en/ and /pl/ subdirectories
- [ ] Sitemap submitted to Google Search Console
- [ ] Quarterly compliance review (every 3 months for first year)

---

## Lawyer review queue (deadline October 2027)

- [ ] Polish lawyer review of /pl/nota-prawna (Imprint)
- [ ] Polish lawyer review of /pl/polityka-prywatnosci (Privacy)
- [ ] Polish lawyer review of /pl/zastrzezenie-medyczne (Disclaimer)
- [ ] NZ lawyer or MAS member services review of /imprint, /privacy, /disclaimer (English versions)
- [ ] Update legal pages based on review feedback
- [ ] Document review completion in brand spec amendment

**Estimated cost:** PLN 1,000–2,500 for Polish review; NZD 500–1,500 for NZ review or MAS template adaptation. Total approximately PLN 5,000 / NZD 2,000. Time commitment: 2–4 weeks elapsed.
