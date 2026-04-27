// src/lib/images.ts — brand image manifest reference
//
// Direct per-page imports are the only way to guarantee Vite tree-shaking:
// runtime-resolved registries (lazy globs, dynamic-import switch statements)
// cause Vite to emit every matched asset into the build, regardless of
// whether it's reached by the page's render path.
//
// Pattern for pages:
//   import img12 from '@/assets/img/img-12.jpg';
//   <PhotoBreak src={img12} alt="..." />
//
// The brand image library is documented in _handoff/design/photo-manifest.md.
// Quick reference (tier list):
//
//   PRIMARY TIER (used in MVP):
//     img-12  Home hero (OR lights, no mask)              4:5
//     img-13  Canonical headshot (close-up, blue blazer)  1:1
//     img-14  About hero (exam room with anatomy posters) 4:3
//     img-19  About break before research                 4:5 tall
//     img-08  Section dividers across site                16:9
//     img-02  Home break: specialties → publications      16:9
//     img-11  Polish-only sterile-technique pages         16:9
//
//   STRONG SUPPORTING (5):  img-05, img-15, img-16, img-17, img-18
//   SUPPORTING (treated, OR shots): img-04, img-09, img-10
//   ALTERNATE TIER (4):     img-01, img-03, img-06, img-20
//   ARCHIVE (not in MVP):   img-07
//
// OR shots (img-04, 09, 10, 12) need saturate(0.96) at minimum (per manifest).

export type BrandImageId =
  | 'img-01' | 'img-02' | 'img-03' | 'img-04' | 'img-05'
  | 'img-06' | 'img-07' | 'img-08' | 'img-09' | 'img-10'
  | 'img-11' | 'img-12' | 'img-13' | 'img-14' | 'img-15'
  | 'img-16' | 'img-17' | 'img-18' | 'img-19' | 'img-20';
