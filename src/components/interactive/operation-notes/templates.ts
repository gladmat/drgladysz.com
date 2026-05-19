// Static registry of all operation-note templates.
//
// Per-template .tsx files export a `meta` object alongside a default
// component. This module imports each and surfaces a single ordered list
// for the index page + a lookup by slug for the detail route.
//
// Static-import map (NOT import.meta.glob) — same lesson as calculator
// registry: Vite would emit every glob target as a static asset.
//
// Adding a new template:
//   1. Build site/src/components/interactive/operation-notes/<Name>.tsx
//      with an exported `meta` and a default Component.
//   2. Import it here and append to OPERATION_NOTE_TEMPLATES.
//   3. Add an entry to OPERATION_NOTE_COMPONENTS (slug → component).

import type { ComponentType } from 'preact';

import SkinLesionExcision, { meta as skinLesionExcisionMeta } from './SkinLesionExcision';
import MelanomaWLE, { meta as melanomaWleMeta } from './MelanomaWLE';
import HandTrauma, { meta as handTraumaMeta } from './HandTrauma';
import HandInfectionDrainage, { meta as handInfectionDrainageMeta } from './HandInfectionDrainage';
import FreeFlapReconstruction, { meta as freeFlapReconstructionMeta } from './FreeFlapReconstruction';

export type OperationNoteCategory =
  | 'skin-soft-tissue'
  | 'hand-surgery'
  | 'free-flap';

export interface OperationNoteTemplateMeta {
  slug: string;
  title: string;
  indication: string;
  category: OperationNoteCategory;
  emits: string;
  lastReviewed: string; // YYYY-MM-DD
  version: string; // semver-ish
}

export interface OperationNoteTemplate {
  meta: OperationNoteTemplateMeta;
  component: ComponentType<{}>;
}

// Order within the array == order each template was authored. The category
// grouping on the index page comes from CATEGORY_ORDER + filter; the index
// doesn't sort by this array's order.
export const OPERATION_NOTE_TEMPLATES: OperationNoteTemplate[] = [
  { meta: skinLesionExcisionMeta, component: SkinLesionExcision },
  { meta: melanomaWleMeta, component: MelanomaWLE },
  { meta: handTraumaMeta, component: HandTrauma },
  { meta: handInfectionDrainageMeta, component: HandInfectionDrainage },
  { meta: freeFlapReconstructionMeta, component: FreeFlapReconstruction },
];

// Slug-keyed component map. Astro/Vite can statically analyse direct object
// indexing (`MAP[slug]`) to bundle the right component for `client:load`,
// but cannot trace through function calls or destructured props. The detail
// route must read from this map directly — see /en/operation-notes/[slug].astro.
// Mirrors the calculator's registry shape verbatim.
export const OPERATION_NOTE_COMPONENTS: Record<string, ComponentType<{}>> = {
  'skin-lesion-excision': SkinLesionExcision,
  'melanoma-wide-local-excision-slnb': MelanomaWLE,
  'hand-trauma': HandTrauma,
  'hand-infection-drainage': HandInfectionDrainage,
  'free-flap-reconstruction': FreeFlapReconstruction,
};

export const OPERATION_NOTE_CATEGORY_LABEL: Record<
  OperationNoteCategory,
  string
> = {
  'skin-soft-tissue': 'Skin and soft tissue',
  'hand-surgery': 'Hand surgery',
  'free-flap': 'Free flap reconstruction',
};

export const OPERATION_NOTE_CATEGORY_BLURB: Record<
  OperationNoteCategory,
  string
> = {
  'skin-soft-tissue':
    'Excisions, biopsies, and reconstructions of cutaneous and subcutaneous lesions — benign and malignant.',
  'hand-surgery':
    'Acute hand surgery: trauma (laceration / fracture / tendon / nerve, one accident covered by one note) and infection (PFT / deep space / septic arthritis). Almost always ACC-funded for trauma.',
  'free-flap':
    'Microvascular tissue transfer for complex composite defects after trauma or oncologic resection.',
};

export const OPERATION_NOTE_CATEGORY_ORDER: OperationNoteCategory[] = [
  'skin-soft-tissue',
  'hand-surgery',
  'free-flap',
];

export function getOperationNoteBySlug(
  slug: string,
): OperationNoteTemplate | undefined {
  return OPERATION_NOTE_TEMPLATES.find((t) => t.meta.slug === slug);
}
