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

export const IMAGE_FORMATS = ['avif', 'webp', 'jpeg'] as const;
