// src/lib/image-config.ts — shared image-pipeline constants
//
// PhotoBreak's <Picture> and BaseLayout's <link rel="preload"> must use
// IDENTICAL options for the preloaded URL to match what <picture> resolves
// (otherwise the browser fetches twice).

export const IMAGE_WIDTHS = [480, 800, 1100, 1600, 2200] as const;

// Sharp's AVIF default quality (50) is aggressive but produces visible
// artefacts on portraits. 80 keeps texture (skin, fabric, surgical instruments)
// while still cutting bytes 4-5x vs WebP.
export const IMAGE_QUALITY = 80;

export const IMAGE_SIZES_FULLBLEED =
  '(max-width: 767px) 100vw, (max-width: 1319px) 92vw, 1320px';

// Home hero image sits in the right column of a 6fr/5fr split inside the 1320px
// container with a clamp(40px, 6vw, 96px) gap. Below 900px the grid stacks and
// the image goes full-bleed at 92vw. The 600px upper cap matches the column
// width at the 1320px container max.
export const IMAGE_SIZES_HERO_SPLIT =
  '(max-width: 900px) 92vw, (max-width: 1320px) 45vw, 600px';

export const IMAGE_FORMATS = ['avif', 'webp', 'jpeg'] as const;
