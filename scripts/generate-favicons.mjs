// scripts/generate-favicons.mjs
//
// One-shot generator for the PNG favicon variants. Source design is the MG
// monogram in IBM Plex Serif Medium, oxblood (#5C2E2E) on cream (#FAF7F2)
// — see brand spec v1.7 §2.
//
// Run with:    node scripts/generate-favicons.mjs
// Outputs:     public/apple-touch-icon.png  (180×180, iOS home screen)
//              public/favicon-192.png        (Android home screen)
//              public/favicon-512.png        (Android splash)
//
// public/favicon.svg is committed as the canonical mark for browsers; the
// PNGs above are only consumed by mobile add-to-home-screen flows.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="#FAF7F2"/>
  <text x="90" y="125" font-family="'IBM Plex Serif', Georgia, serif" font-size="120" font-weight="500" fill="#5C2E2E" text-anchor="middle" letter-spacing="-2">MG</text>
</svg>`;

const targets = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'favicon-512.png', size: 512 },
];

for (const { name, size } of targets) {
  const png = await sharp(Buffer.from(masterSvg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const outPath = resolve(PUBLIC_DIR, name);
  await writeFile(outPath, png);
  console.log(`Wrote ${outPath} (${png.byteLength} bytes)`);
}
