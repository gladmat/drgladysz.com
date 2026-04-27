import type { Config } from 'tailwindcss';

/**
 * Tailwind config consuming Aarau Graphite brand tokens.
 * Token values mirror /design/brand-tokens.json — keep in sync if either changes.
 *
 * Usage in components:
 *   <div className="bg-bg text-ink">          // cream bg, near-black ink
 *   <h1 className="font-serif text-display">  // Plex Serif, display size
 *   <p className="text-body-lg leading-body">  // 18px / 1.6 line-height
 *   <span className="text-accent">link</span>  // oxblood
 */

const config: Config = {
  content: [
    './src/**/*.{astro,js,ts,jsx,tsx,mdx,md}',
    './src/content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#FAF7F2',  // cream — page background
          card: '#FFFFFF',      // white — cards, modals, forms
          deep: '#F0EBE2',      // cream-deep — variant surfaces
          dark: '#14171A',      // near-black — dark mode / inverted blocks
        },
        ink: {
          DEFAULT: '#14171A',   // body text, strong headings
          2: '#3D434A',         // secondary text
          3: '#6E7173',         // tertiary text
          'on-dark': '#FAF7F2', // text on dark backgrounds
        },
        accent: '#5C2E2E',      // oxblood — links, key CTAs only
        rule: {
          DEFAULT: '#E8E2D8',   // warm beige — 1px dividers
          strong: '#C9C0B0',    // strong divider — table headers
        },
      },
      fontFamily: {
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Custom scale — overrides Tailwind defaults to lock the system
        'display': ['64px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'h1': ['48px', { lineHeight: '1.10', letterSpacing: '-0.015em' }],
        'h2': ['36px', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'h3': ['28px', { lineHeight: '1.20', letterSpacing: '-0.005em' }],
        'h4': ['22px', { lineHeight: '1.30', letterSpacing: '0' }],
        'body-lg': ['18px', { lineHeight: '1.60', letterSpacing: '0' }],
        'body': ['16px', { lineHeight: '1.60', letterSpacing: '0' }],
        'body-sm': ['14px', { lineHeight: '1.50', letterSpacing: '0' }],
        'caption': ['12px', { lineHeight: '1.40', letterSpacing: '0.02em' }],
      },
      letterSpacing: {
        'credentials': '0.14em',  // Cover-spread credentials line
        'section-label': '0.12em', // Mono uppercase section labels
        'footer-caption': '0.10em',
      },
      spacing: {
        // 8pt scale custom additions
        's1': '4px',
        's2': '8px',
        's3': '12px',
        's4': '16px',
        's5': '24px',
        's6': '32px',
        's8': '48px',
        's10': '64px',
        's12': '80px',
        's16': '128px',
      },
      maxWidth: {
        'narrow': '740px',
        'container': '1320px',
      },
      screens: {
        'mobile-max': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1023px' },
        'desktop': { 'min': '1024px' },
      },
    },
  },
  plugins: [],
};

export default config;
