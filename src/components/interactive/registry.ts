// src/components/interactive/registry.ts
//
// Calculator component registry. Maps Sanity `componentName` strings to
// their Preact island implementations. Page templates do
//
//   const Component = calculatorRegistry[calc.componentName];
//   <Component client:load />
//
// Astro's per-page island compiler emits a separate hydration script per
// `<Component client:*>` directive, so even though this registry imports
// every island statically, only the one referenced on a given page ends up
// in that page's <script> tags.
//
// Static-import map (NOT import.meta.glob) — globs and dynamic switches make
// Vite emit every glob target as a static asset. See site/CLAUDE.md image-
// registry note for the same lesson.
//
// Adding a new calculator:
//   1. Build src/components/interactive/<Name>.tsx
//   2. Import it here and add to the map
//   3. Update the Sanity schema's componentName options to include the value
//   4. Author Sanity content with that componentName
import QuickDASH from './QuickDASH';
import type { CalculatorComponentName } from '@/lib/sanity';
import type { ComponentType } from 'preact';

interface CalculatorProps {
  locale?: 'en' | 'pl';
}

// PRWE / Boston CTS / MHQ / Mayo Wrist not yet built — they require the
// validation paper for clinical correctness, which is gated on Mateusz's
// review session. The registry returns undefined for unbuilt calculators
// and the page template renders a placeholder ("Calculator in preparation").
export const calculatorRegistry: Partial<
  Record<CalculatorComponentName, ComponentType<CalculatorProps>>
> = {
  quickdash: QuickDASH,
};
