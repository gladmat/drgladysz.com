// site/scripts/audit-fix-author-populate.ts
//
// Audit fix (2026-05-14, per audit Part 1 §P1-SEO-2): populate the canonical
// `author` doc's E-E-A-T fields. Before this patch they were either missing
// (the four new fields added in `studio/schemas/author.ts` 2026-05-14) or
// null (bio, orcid, linkedin pre-existed in the schema but were never
// populated).
//
// The target document is the author referenced by every article/procedure
// (resolved by GROQ as the first `_type == "author"` doc). At time of patch
// there is one author doc in production with _id starting `2cbd8bcc-`.
//
// PRE-REQUISITE: deploy the extended author schema first, otherwise Sanity
// will reject the unknown fields:
//   cd site && npx sanity@latest schema deploy
//
// Idempotent — `set` overwrites; safe to re-run.
//
// Usage:
//   cd site
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-author-populate.ts          # dry-run
//   node --experimental-strip-types --env-file=.env.local scripts/audit-fix-author-populate.ts --commit

import { createClient } from '@sanity/client';

const COMMIT = process.argv.includes('--commit');
const TOKEN =
  process.env.SANITY_API_DEVELOPER_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  '';
if (COMMIT && !TOKEN) {
  console.error('✗ Missing SANITY_API_DEVELOPER_TOKEN. Pass --commit only when env is set.');
  process.exit(1);
}

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || 'kwp48q91',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-01-01',
  token: TOKEN || undefined,
  useCdn: false,
});

// Values composed from the locked content master (drgladysz-content-master-v1.0.md)
// + the legal-pages-package + CLAUDE.md. Single source of truth in the brand
// system; this script is the build-time materialization.
const BIO =
  'Mateusz Gładysz is a Consultant Plastic and Hand Surgeon at Waikato Hospital, Hamilton, New Zealand, and Chair of the Melanoma and High-Risk Skin Cancer MDT. European double board-certified (FEBOPRAS, FEBHS) following training pathways through the University Hospital of Zurich, Hannover Medical School, and the Perth International Plastic and Reconstructive Fellowship, with sub-specialty hand surgery training as Oberarzt at Kantonsspital Aarau. Doctoral research at the University of Zurich addresses clinical applications of artificial intelligence in surgical care.';

const KNOWS_ABOUT = [
  'Hand surgery',
  'Microsurgery',
  'Reconstructive surgery',
  'Plastic surgery',
  'Skin cancer surgery',
  'Melanoma surgery',
  'Carpal tunnel syndrome',
  'Dupuytren disease',
  'Scaphoid fracture',
  'Flexor tendon repair',
  'Extensor tendon injury',
  'Free flap reconstruction',
  'DIEP flap',
  'Lower-limb orthoplastic reconstruction',
  'Head and neck reconstruction',
  'Compression neuropathy',
  'Cubital tunnel syndrome',
  'Wide local excision',
  'Sentinel lymph node biopsy',
  'AI-assisted medical documentation',
];

const ALUMNI_OF = [
  { name: 'Medical University of Warsaw', url: 'https://wum.edu.pl/' },
  { name: 'University of Zurich', url: 'https://www.uzh.ch/' },
  { name: 'Hannover Medical School', url: 'https://www.mhh.de/' },
  { name: 'University Hospital of Zurich', url: 'https://www.usz.ch/' },
  { name: 'Sir Charles Gairdner Hospital (Perth)', url: 'https://www.scgophcg.health.wa.gov.au/' },
  { name: 'Kantonsspital Aarau', url: 'https://www.ksa.ch/' },
];

const AFFILIATIONS = [
  {
    name: 'Waikato Hospital — Health New Zealand Te Whatu Ora Waikato',
    role: 'Consultant Plastic and Hand Surgeon; Chair, Melanoma and High-Risk Skin Cancer MDT',
    url: 'https://www.tewhatuora.govt.nz/',
  },
  {
    name: 'University of Zurich',
    role: 'Doctoral candidate (PhD) — clinical applications of AI in surgical care',
    url: 'https://www.uzh.ch/',
  },
  {
    name: 'Medical Council of New Zealand',
    role: 'Registered medical practitioner (#93463)',
    url: 'https://www.mcnz.org.nz/',
  },
  {
    name: 'Okręgowa Izba Lekarska w Warszawie',
    role: 'PWZ 2985148',
    url: 'https://izba-lekarska.pl/',
  },
  { name: 'Polskie Towarzystwo Chirurgii Plastycznej, Rekonstrukcyjnej i Estetycznej' },
  { name: 'Polskie Towarzystwo Chirurgii Ręki' },
  { name: 'American Society for Surgery of the Hand', role: 'International Member' },
];

const SAME_AS = [
  'https://orcid.org/0009-0009-2380-4056',
  'https://www.linkedin.com/in/mateuszgladysz',
  // PWZ register profile + MCNZ register profile can be added when their URLs
  // become stable. As of 2026-05-14 neither has a stable deep-link.
];

const ORCID = '0009-0009-2380-4056';
const LINKEDIN = 'https://www.linkedin.com/in/mateuszgladysz';

async function main() {
  console.log(`audit-fix-author-populate — ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);

  const authors = await client.fetch<{ _id: string; name: string }[]>(
    `*[_type == "author"]{_id, name}`,
  );
  if (authors.length === 0) {
    console.error('  ✗ No author docs found in dataset.');
    process.exit(1);
  }
  if (authors.length > 1) {
    console.warn(`  ⚠ ${authors.length} author docs found. Patching all of them.`);
  }

  for (const author of authors) {
    console.log(`  · ${author._id} — ${author.name}`);
    if (!COMMIT) continue;
    await client
      .patch(author._id)
      .set({
        bio: BIO,
        orcid: ORCID,
        linkedin: LINKEDIN,
        knowsAbout: KNOWS_ABOUT,
        alumniOf: ALUMNI_OF,
        affiliations: AFFILIATIONS,
        sameAs: SAME_AS,
      })
      .commit();
    console.log(`    ✓ committed`);
  }

  if (!COMMIT) {
    console.log('\n(dry-run — re-run with --commit to apply)');
    console.log(`Will patch ${authors.length} author doc(s) with:`);
    console.log(`  bio: ${BIO.length} chars`);
    console.log(`  knowsAbout: ${KNOWS_ABOUT.length} topics`);
    console.log(`  alumniOf: ${ALUMNI_OF.length} institutions`);
    console.log(`  affiliations: ${AFFILIATIONS.length} affiliations`);
    console.log(`  sameAs: ${SAME_AS.length} URLs`);
  }
}

main().catch((err) => {
  console.error('\n✗ Patch failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
