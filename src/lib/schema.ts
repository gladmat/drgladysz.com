// src/lib/schema.ts
//
// Schema.org JSON-LD generators.
//
// Three shapes used:
//   - MedicalScholarlyArticle for clinical articles (peer/expert audience).
//   - MedicalWebPage for patient-facing articles.
//   - MedicalProcedure for procedure pages.
//
// All include a citation array sourced from the page's references, surfacing
// the scholarly evidence directly in the structured data so search engines
// and LLMs can index the supporting literature alongside the article content.
import type {
  SanityArticle,
  SanityProcedurePage,
  SanityRefDoc,
  PortableTextBlock,
  GlossarySummary,
  SanityGlossaryTermFull,
  FaqItem,
} from './sanity';

type Locale = 'en' | 'pl';
const LANG_TAG: Record<Locale, 'en-NZ' | 'pl-PL'> = {
  en: 'en-NZ',
  pl: 'pl-PL',
};

const SITE_URL = (
  import.meta.env.PUBLIC_SITE_URL || 'https://drgladysz.com'
).replace(/\/$/, '');

const PERSON_ID = `${SITE_URL}/#person`;
const PHYSICIAN_ID = `${SITE_URL}/#physician`;
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const ORGANIZATION_NAME = 'Mateusz Gładysz, MD — Plastic & Hand Surgery';

export { PERSON_ID, PHYSICIAN_ID, ORGANIZATION_ID, ORGANIZATION_NAME, SITE_URL };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Best-effort plain-text extraction from a Portable Text array. Used to
 *  populate `description` / `abstract` properties from a block field without
 *  shipping the full Portable Text tree. */
function blocksToPlainText(
  blocks: PortableTextBlock[] | undefined,
  options: { maxChars?: number } = {},
): string {
  if (!blocks) return '';
  const { maxChars = 800 } = options;
  let text = '';
  for (const block of blocks) {
    if (!block || (block as { _type?: unknown })._type !== 'block') continue;
    const children =
      (block as { children?: { text?: string }[] }).children ?? [];
    const lineText = children.map((c) => c.text ?? '').join('');
    text += lineText + ' ';
    if (text.length >= maxChars) break;
  }
  return text.trim().slice(0, maxChars);
}

function refToCitationItem(ref: SanityRefDoc) {
  // CreativeWork-shaped citation entry for inclusion under
  // MedicalScholarlyArticle.citation. We use ScholarlyArticle for journal
  // articles (the dominant case); books/chapters get CreativeWork.
  const isJournal = !ref.pubType || ref.pubType === 'journal';

  // Split pagination into start + end where present. Sanity stores pages as
  // free text ("123-130", "e1-e8", "S12"). The split tolerates hyphen, en-dash,
  // and em-dash separators.
  let pageFields: { pageStart?: string; pageEnd?: string } = {};
  if (ref.pages) {
    const parts = ref.pages.split(/[-–—]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 1) pageFields.pageStart = parts[0];
    if (parts.length >= 2) pageFields.pageEnd = parts[1];
  }

  return {
    '@type': isJournal ? 'ScholarlyArticle' : 'CreativeWork',
    name: ref.title,
    headline: ref.title,
    author: ref.authors.map((a) => ({ '@type': 'Person', name: a })),
    datePublished: String(ref.year),
    isPartOf: ref.journal
      ? {
          '@type': isJournal ? 'Periodical' : 'CreativeWork',
          name: ref.journal,
          ...(ref.volume ? { volumeNumber: ref.volume } : {}),
          ...(ref.issue ? { issueNumber: ref.issue } : {}),
        }
      : undefined,
    ...(ref.doi ? { sameAs: `https://doi.org/${ref.doi}` } : {}),
    ...(ref.pmid
      ? {
          identifier: [
            { '@type': 'PropertyValue', propertyID: 'PMID', value: ref.pmid },
          ],
        }
      : {}),
    ...pageFields,
  };
}

// ---------------------------------------------------------------------------
// Article JSON-LD
// ---------------------------------------------------------------------------

interface ArticleSchemaInput {
  article: SanityArticle;
  references: SanityRefDoc[];
  url: string; // canonical URL of the article
  authorName?: string;
  // Defaults to the article's `language` field; falls back to 'en' when the
  // doc predates the field. EN/PL pages can also override explicitly.
  locale?: Locale;
  // Pre-resolved hero image data — caller computes the URL via Sanity's
  // image-url builder (the schema module deliberately doesn't import it
  // to keep this generator pure / framework-agnostic). Width/height are
  // the dimensions of the URL emitted, not the source asset; pass 1200×800
  // for a standard rich-snippet aspect.
  heroImage?: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
}

// Category → human label (also used as schema.org articleSection).
const ARTICLE_SECTION_LABEL: Record<SanityArticle['category'], string> = {
  patient: 'Patient information',
  expert: 'Expert blog',
  'fessh-prep': 'FESSH preparation',
  news: 'News & commentary',
};

export function generateArticleSchema({
  article,
  references,
  url,
  authorName = 'Mateusz Gładysz',
  locale,
  heroImage,
}: ArticleSchemaInput) {
  const isPatientFacing = article.audience === 'patient';
  const articleType = isPatientFacing
    ? 'MedicalWebPage'
    : 'MedicalScholarlyArticle';

  const description =
    article.seoDescription ||
    article.excerpt ||
    blocksToPlainText(article.body, { maxChars: 200 });

  const resolvedLocale = locale ?? article.language ?? 'en';
  const isFesshPrep = article.category === 'fessh-prep';

  // Compute word count from the article body. Used as schema.org wordCount —
  // a signal for content-depth assessments. Capped maxChars at 100k to avoid
  // pathological cost on very long articles (none currently exceed ~50k chars).
  const plainBody = blocksToPlainText(article.body, { maxChars: 100_000 });
  const wordCount = plainBody.split(/\s+/).filter(Boolean).length;

  // Publication date defaults to the article's publishedDate; modified date
  // tracks editorial revisions. lastReviewed (separate field in schema.org)
  // signals medical / clinical review, which Google's Quality Rater
  // Guidelines explicitly favour for health content. The Sanity field is
  // named `lastUpdated` but labelled "Last clinically reviewed" — same date
  // serves both purposes.
  const lastReviewed = article.lastUpdated || article.publishedDate;

  return {
    '@context': 'https://schema.org',
    '@type': articleType,
    ...(isFesshPrep
      ? {
          additionalType: 'https://schema.org/LearningResource',
          learningResourceType: 'article',
          educationalLevel: 'PostGraduate',
          educationalAlignment: {
            '@type': 'AlignmentObject',
            alignmentType: 'assesses',
            targetName: 'FESSH Diploma curriculum',
          },
        }
      : {}),
    headline: article.title,
    name: article.title,
    description,
    inLanguage: LANG_TAG[resolvedLocale],
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: article.publishedDate,
    dateModified: lastReviewed,
    // Medical-content signal: distinct from dateModified semantically (this is
    // the *clinical* review, not the *editorial* edit). For drgladysz.com the
    // two are populated from the same Sanity field, but the JSON-LD exposes
    // both because Google's QRG / AI engines weight them differently.
    lastReviewed,
    reviewedBy: {
      '@type': 'Physician',
      '@id': PERSON_ID,
      name: authorName,
    },
    wordCount,
    articleSection: ARTICLE_SECTION_LABEL[article.category],
    ...(article.seoKeywords && article.seoKeywords.length > 0
      ? { keywords: article.seoKeywords.join(', ') }
      : {}),
    ...(article.primaryCondition
      ? {
          about: {
            '@type': 'MedicalCondition',
            name: article.primaryCondition.name,
            ...(article.primaryCondition.alternateName &&
            article.primaryCondition.alternateName.length > 0
              ? { alternateName: article.primaryCondition.alternateName }
              : {}),
            ...(article.primaryCondition.icd10
              ? {
                  code: {
                    '@type': 'MedicalCode',
                    codeValue: article.primaryCondition.icd10,
                    codingSystem: 'ICD-10',
                  },
                }
              : {}),
          },
        }
      : {}),
    author: {
      '@type': 'Physician',
      '@id': PERSON_ID,
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: ORGANIZATION_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon-512.png`,
        width: 512,
        height: 512,
      },
    },
    audience: {
      '@type': 'MedicalAudience',
      audienceType: isPatientFacing ? 'Patient' : 'MedicalProfessional',
    },
    ...(references.length > 0
      ? { citation: references.map(refToCitationItem) }
      : {}),
    // Emit a complete ImageObject only when the caller supplies a URL —
    // a description-only image entry is useless to search engines, so the
    // generator now omits the field entirely when there's nothing to point at.
    ...(heroImage
      ? {
          image: {
            '@type': 'ImageObject',
            url: heroImage.url,
            width: heroImage.width,
            height: heroImage.height,
            ...(heroImage.alt ? { description: heroImage.alt } : {}),
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Procedure JSON-LD
// ---------------------------------------------------------------------------

interface ProcedureSchemaInput {
  procedure: SanityProcedurePage;
  references: SanityRefDoc[];
  url: string;
  authorName?: string;
  locale?: Locale;
  heroImage?: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
}

export function generateProcedureSchema({
  procedure,
  references,
  url,
  authorName = 'Mateusz Gładysz',
  locale,
  heroImage,
}: ProcedureSchemaInput) {
  const description =
    procedure.seoDescription ||
    procedure.summary ||
    blocksToPlainText(procedure.indications, { maxChars: 200 });

  const resolvedLocale = locale ?? procedure.language ?? 'en';
  const lastReviewed = procedure.lastUpdated;

  // Build the MedicalIndication, optionally pinned to a MedicalCondition with
  // ICD-10 code. The condition linkage is the single strongest AI-engine
  // retrieval signal for medical procedures: "what does X say about <ICD-10>"
  // resolves via this binding.
  const indicationBlock: Record<string, unknown> = {
    '@type': 'MedicalIndication',
    name: 'Indications',
    description: blocksToPlainText(procedure.indications, { maxChars: 300 }),
  };
  if (procedure.primaryCondition) {
    indicationBlock.healthCondition = {
      '@type': 'MedicalCondition',
      name: procedure.primaryCondition.name,
      ...(procedure.primaryCondition.alternateName &&
      procedure.primaryCondition.alternateName.length > 0
        ? { alternateName: procedure.primaryCondition.alternateName }
        : {}),
      ...(procedure.primaryCondition.icd10
        ? {
            code: {
              '@type': 'MedicalCode',
              codeValue: procedure.primaryCondition.icd10,
              codingSystem: 'ICD-10',
            },
          }
        : {}),
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: procedure.title,
    description,
    procedureType: 'SurgicalProcedure',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    dateModified: lastReviewed,
    lastReviewed,
    reviewedBy: {
      '@type': 'Physician',
      '@id': PERSON_ID,
      name: authorName,
    },
    inLanguage: LANG_TAG[resolvedLocale],
    bodyLocation: blocksToPlainText(procedure.anatomy, { maxChars: 240 }),
    preparation: blocksToPlainText(procedure.positioning, { maxChars: 240 }),
    followup: blocksToPlainText(procedure.aftercare, { maxChars: 300 }),
    expectedPrognosis: blocksToPlainText(procedure.complications, {
      maxChars: 300,
    }),
    indication: indicationBlock,
    performedBy: {
      '@type': 'Physician',
      '@id': PERSON_ID,
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: ORGANIZATION_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon-512.png`,
        width: 512,
        height: 512,
      },
    },
    ...(procedure.seoKeywords && procedure.seoKeywords.length > 0
      ? { keywords: procedure.seoKeywords.join(', ') }
      : {}),
    audience: {
      '@type': 'MedicalAudience',
      audienceType:
        procedure.audience === 'patient'
          ? 'Patient'
          : procedure.audience === 'mixed'
            ? 'Patient'
            : 'MedicalProfessional',
    },
    ...(references.length > 0
      ? { citation: references.map(refToCitationItem) }
      : {}),
    ...(heroImage
      ? {
          image: {
            '@type': 'ImageObject',
            url: heroImage.url,
            width: heroImage.width,
            height: heroImage.height,
            ...(heroImage.alt ? { description: heroImage.alt } : {}),
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Breadcrumb JSON-LD (optional helper)
// ---------------------------------------------------------------------------

export function generateBreadcrumb(
  items: { name: string; url: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ---------------------------------------------------------------------------
// ContactPage JSON-LD
//
// Per locked contact draft v1.0 + brand-spec Decision #22 — no `telephone`
// or `address` properties at MVP. The `mainEntity` reference assumes the
// existence of a `Person`/`Physician` block elsewhere on the site (about
// page) keyed at `${siteUrl}/#person`; same convention as `isPartOf`'s
// `${siteUrl}/#website` reference. These #ids are forward-references —
// the schema is still valid if those blocks aren't actually rendered yet,
// they just don't resolve into a richer entity until they do.
// ---------------------------------------------------------------------------

interface ContactPageInput {
  url: string; // canonical URL of the contact page
  locale: 'en' | 'pl';
  siteUrl: string; // e.g. 'https://drgladysz.com'
  name?: string; // override the default 'Contact — Mateusz Gładysz'
}

export function generateContactPageSchema({
  url,
  locale,
  siteUrl,
  name,
}: ContactPageInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: name ?? 'Contact — Mateusz Gładysz',
    url,
    inLanguage: locale === 'pl' ? 'pl-PL' : 'en-NZ',
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: { '@id': `${siteUrl}/#person` },
  };
}

// ---------------------------------------------------------------------------
// Glossary JSON-LD (DefinedTerm + DefinedTermSet)
// ---------------------------------------------------------------------------

interface DefinedTermSetInput {
  url: string; // canonical URL of the index page (also used as @id)
  name: string;
  description: string;
  inLanguage: 'en-NZ' | 'pl-PL';
  terms: GlossarySummary[];
  termUrlPrefix: string; // e.g. "https://drgladysz.com/en/glossary/"
  locale: 'en' | 'pl';
}

export function generateDefinedTermSetSchema({
  url,
  name,
  description,
  inLanguage,
  terms,
  termUrlPrefix,
  locale,
}: DefinedTermSetInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': url,
    name,
    description,
    url,
    inLanguage,
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: locale === 'pl' && t.termPolish ? t.termPolish : t.term,
      description:
        locale === 'pl' && t.shortDefinitionPolish
          ? t.shortDefinitionPolish
          : t.shortDefinition,
      url: `${termUrlPrefix}${t.slug.current}/`,
    })),
  };
}

interface DefinedTermInput {
  term: SanityGlossaryTermFull;
  url: string;
  inSetUrl: string; // @id of the parent DefinedTermSet
  inLanguage: 'en-NZ' | 'pl-PL';
  locale: 'en' | 'pl';
}

export function generateDefinedTermSchema({
  term,
  url,
  inSetUrl,
  inLanguage,
  locale,
}: DefinedTermInput) {
  const displayName =
    locale === 'pl' && term.termPolish ? term.termPolish : term.term;
  const description =
    locale === 'pl' && term.shortDefinitionPolish
      ? term.shortDefinitionPolish
      : term.shortDefinition;

  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: displayName,
    description,
    url,
    inLanguage,
    inDefinedTermSet: inSetUrl,
    ...(term.synonyms && term.synonyms.length > 0
      ? { alternateName: term.synonyms }
      : {}),
    termCode: term.slug.current,
  };
}

// ---------------------------------------------------------------------------
// MedicalCondition JSON-LD
//
// Companion entity for procedure pages — surfaces the condition treated by
// the procedure with ICD-10 code, signs, treatments, and differential
// diagnoses. Per the PL CTS SEO spec §2.2 (`zespol-ciesni-nadgarstka`,
// G56.0). Authored explicitly by the page template; not derived from a
// Sanity field. Multiple JSON-LD blocks coexist via SiteLayout's `jsonLd`
// array prop, so this sits alongside MedicalProcedure + BreadcrumbList +
// FAQPage on the same page.
// ---------------------------------------------------------------------------

interface MedicalConditionInput {
  url: string;
  locale: Locale;
  name: string;
  alternateName?: string[];
  description: string;
  icd10?: string;
  icd9?: string;
  signOrSymptom?: string[];
  possibleTreatment?: string[];
  differentialDiagnosis?: string[];
  epidemiology?: string;
  relevantSpecialty?: string[];
}

export function generateMedicalConditionSchema({
  url,
  locale,
  name,
  alternateName,
  description,
  icd10,
  icd9,
  signOrSymptom,
  possibleTreatment,
  differentialDiagnosis,
  epidemiology,
  relevantSpecialty,
}: MedicalConditionInput) {
  const codes: object[] = [];
  if (icd10)
    codes.push({
      '@type': 'MedicalCode',
      codeValue: icd10,
      codingSystem: 'ICD-10',
    });
  if (icd9)
    codes.push({
      '@type': 'MedicalCode',
      codeValue: icd9,
      codingSystem: 'ICD-9-CM',
    });
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalCondition',
    name,
    description,
    url,
    inLanguage: LANG_TAG[locale],
    ...(alternateName && alternateName.length > 0 ? { alternateName } : {}),
    ...(codes.length > 0 ? { code: codes.length === 1 ? codes[0] : codes } : {}),
    ...(signOrSymptom && signOrSymptom.length > 0
      ? {
          signOrSymptom: signOrSymptom.map((s) => ({
            '@type': 'MedicalSignOrSymptom',
            name: s,
          })),
        }
      : {}),
    ...(possibleTreatment && possibleTreatment.length > 0
      ? {
          possibleTreatment: possibleTreatment.map((t) => ({
            '@type': 'MedicalTherapy',
            name: t,
          })),
        }
      : {}),
    ...(differentialDiagnosis && differentialDiagnosis.length > 0
      ? {
          differentialDiagnosis: differentialDiagnosis.map((d) => ({
            '@type': 'DDxElement',
            distinguishingSign: { '@type': 'MedicalSignOrSymptom', name: d },
          })),
        }
      : {}),
    ...(epidemiology ? { epidemiology } : {}),
    ...(relevantSpecialty && relevantSpecialty.length > 0
      ? { relevantSpecialty }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// FAQPage JSON-LD
//
// Emitted on procedure pages whose Sanity doc has `faq[]` populated. Each
// FaqItem becomes a Question/Answer pair; the answer is derived from the
// portable-text `answer` field via plaintext extraction (search engines
// don't render the rich formatting in rich snippets, so plaintext is
// sufficient and avoids escaping issues).
// ---------------------------------------------------------------------------

export function generateFaqPageSchema(
  faq: FaqItem[],
  url: string,
  locale: Locale,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    inLanguage: LANG_TAG[locale],
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: blocksToPlainText(item.answer, { maxChars: 1200 }),
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// MedicalBusiness + Physician JSON-LD (home page)
//
// Emitted on the EN home page (and optionally the PL home page) to qualify
// for "Local Business" rich-results enhancement and to give AI engines a
// single authoritative entity binding name → credentials → workLocation →
// medical specialties → identifiers across registers.
//
// `@id` is `${SITE_URL}/#physician` — distinct from `#person` (which is the
// lightweight identity block emitted on every page via BaseLayout) and
// `#organization` (the publisher). The three entities are intentionally
// separate: Person is the natural-language identity, Physician is the
// professional / clinical entity, Organization is the publishing entity.
// ---------------------------------------------------------------------------

interface MedicalBusinessInput {
  /** Optional locale override; affects `inLanguage` and alternateName. */
  locale?: Locale;
}

export function generateMedicalBusinessSchema({
  locale = 'en',
}: MedicalBusinessInput = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': ['MedicalBusiness', 'Physician'],
    '@id': PHYSICIAN_ID,
    name: 'Mateusz Gładysz, MD, FEBOPRAS, FEBHS',
    alternateName: 'Dr Mateusz Gładysz',
    url: SITE_URL,
    inLanguage: LANG_TAG[locale],
    image: `${SITE_URL}/og-default.jpg`,
    medicalSpecialty: ['PlasticSurgery'],
    knowsLanguage: ['en', 'pl', 'de'],
    knowsAbout: [
      'Hand surgery',
      'Microsurgery',
      'Reconstructive surgery',
      'Plastic surgery',
      'Skin cancer surgery',
      'Melanoma surgery',
      'Carpal tunnel syndrome',
      'Dupuytren disease',
      'Scaphoid fracture',
      'Free flap reconstruction',
    ],
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'degree',
        name: 'MD',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Medical University of Warsaw',
        },
      },
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'certification',
        name: 'FEBOPRAS',
        recognizedBy: {
          '@type': 'Organization',
          name: 'UEMS — European Board of Plastic, Reconstructive and Aesthetic Surgery',
        },
      },
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'certification',
        name: 'FEBHS',
        recognizedBy: {
          '@type': 'Organization',
          name: 'UEMS — European Board of Hand Surgery',
        },
      },
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'registration',
        name: 'MCNZ Registration',
        identifier: '93463',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Medical Council of New Zealand',
          url: 'https://www.mcnz.org.nz/',
        },
      },
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'registration',
        name: 'PWZ',
        identifier: '2985148',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Naczelna Izba Lekarska — Okręgowa Izba Lekarska w Warszawie',
        },
      },
    ],
    areaServed: [
      {
        '@type': 'AdministrativeArea',
        name: 'Waikato Region',
        containedInPlace: { '@type': 'Country', name: 'New Zealand' },
      },
    ],
    workLocation: {
      '@type': 'Hospital',
      name: 'Waikato Hospital',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Hamilton',
        addressRegion: 'Waikato',
        addressCountry: 'NZ',
      },
      parentOrganization: {
        '@type': 'Organization',
        name: 'Health New Zealand — Te Whatu Ora Waikato',
      },
    },
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Medical University of Warsaw' },
      { '@type': 'CollegeOrUniversity', name: 'University of Zurich' },
      { '@type': 'CollegeOrUniversity', name: 'Hannover Medical School' },
    ],
    memberOf: [
      { '@type': 'Organization', name: 'Polskie Towarzystwo Chirurgii Plastycznej, Rekonstrukcyjnej i Estetycznej' },
      { '@type': 'Organization', name: 'Polskie Towarzystwo Chirurgii Ręki' },
      { '@type': 'Organization', name: 'American Society for Surgery of the Hand (International Member)' },
    ],
    sameAs: [
      'https://orcid.org/0009-0009-2380-4056',
      'https://www.linkedin.com/in/mateuszgladysz',
    ],
    email: 'office@drgladysz.com',
    parentOrganization: { '@id': ORGANIZATION_ID },
  };
}

// ---------------------------------------------------------------------------
// Shared identity blocks — emitted on every page via BaseLayout.
//
// Two minimal entities that downstream JSON-LD references (e.g. article
// `author: { @id: #person }` or `publisher: { @id: #organization }`) resolve
// against. Keeping them on every page means crawlers don't need to follow
// `@id` cross-document — every page is self-contained.
// ---------------------------------------------------------------------------

export function generateSharedPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Mateusz Gładysz',
    honorificSuffix: 'MD, FEBOPRAS, FEBHS',
    url: `${SITE_URL}/en/about/`,
    sameAs: [
      'https://orcid.org/0009-0009-2380-4056',
      'https://www.linkedin.com/in/mateuszgladysz',
    ],
  };
}

export function generateSharedOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: ORGANIZATION_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/favicon-512.png`,
      width: 512,
      height: 512,
    },
  };
}
