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
    ...(ref.pages ? { pageStart: ref.pages.split(/[-–]/)[0] } : {}),
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

  return {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline: article.title,
    name: article.title,
    description,
    inLanguage: LANG_TAG[resolvedLocale],
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: article.publishedDate,
    dateModified: article.lastUpdated || article.publishedDate,
    author: {
      '@type': 'Physician',
      '@id': PERSON_ID,
      name: authorName,
    },
    publisher: {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: authorName,
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

  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: procedure.title,
    description,
    procedureType: 'SurgicalProcedure',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    dateModified: procedure.lastUpdated,
    inLanguage: LANG_TAG[resolvedLocale],
    bodyLocation: blocksToPlainText(procedure.anatomy, { maxChars: 240 }),
    preparation: blocksToPlainText(procedure.positioning, { maxChars: 240 }),
    followup: blocksToPlainText(procedure.aftercare, { maxChars: 300 }),
    expectedPrognosis: blocksToPlainText(procedure.complications, {
      maxChars: 300,
    }),
    indication: {
      '@type': 'MedicalIndication',
      name: 'Indications',
      description: blocksToPlainText(procedure.indications, { maxChars: 300 }),
    },
    performedBy: {
      '@type': 'Physician',
      '@id': PERSON_ID,
      name: authorName,
    },
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
      url: `${termUrlPrefix}${t.slug.current}`,
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
