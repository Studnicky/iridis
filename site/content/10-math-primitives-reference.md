---
title: 10. Math Primitives Reference
description: Every internal colour-math primitive, callable directly as a singleton, outside of the pipeline.
---

iridis exports every internal colour-math primitive as a singleton class (`packages/core/src/math/`). Each has a single `apply()` method — no shared base class, no state. If you only need one calculation, import the singleton directly without touching the pipeline:

```ts
import { luminance, contrastWcag21, oklchToRgb } from '@studnicky/iridis';

const ratio = contrastWcag21.apply(foreground, background);
const rgb = oklchToRgb.apply(0.62, 0.18, 290);
```

The full-formula walkthroughs for WCAG 2.1 and APCA contrast math live in the live demo cards on this site (see the contrast and color-space explorer components), not duplicated here — the table below documents the callable surface only.

## Real implementations

Three of the more interesting primitives, straight from source:

`luminance` is the WCAG 2.1 relative-luminance calculation that every contrast primitive builds on:

<<< @/packages/core/src/math/Luminance.ts

`contrastWcag21` composes `luminance` into the standard `(lighter + 0.05) / (darker + 0.05)` ratio:

<<< @/packages/core/src/math/ContrastWcag21.ts

`ensureContrast` is the least trivial of the set — it walks OKLCH lightness in a bounded loop until a foreground clears a target ratio against a background, preserving the color's original gamut (sRGB vs. wide-gamut) on the way back out:

<<< @/packages/core/src/math/EnsureContrast.ts

### Color-space conversion

| Primitive | Signature | Description |
|---|---|---|
| `hexToRgb` | `apply(hex: string): ColorRecord` | Parses a `#rrggbb`/`#rgb` string into a full `ColorRecord`. |
| `rgbToHex` | `apply(r, g, b): string` | Encodes 0..1 RGB channels back to `#rrggbb`. |
| `rgbToHsl` | `apply(r, g, b, alpha?): HslResult` | Converts sRGB to HSL. |
| `hslToRgb` | `apply(h, s, l, alpha?): ColorRecord` | Converts HSL back to a `ColorRecord`. |
| `rgbToOklch` | `apply(r, g, b, alpha?): ColorRecord` | Converts sRGB to OKLCH via linear-light space. |
| `oklchToRgb` | `apply(l, c, h, alpha?): ColorRecord` | Converts OKLCH to a gamut-mapped sRGB `ColorRecord`. |
| `oklchToRgbRaw` | `apply(l, c, h): Rgb` | Same conversion without gamut mapping or `ColorRecord` wrapping. |
| `oklchToDisplayP3` | `apply(l, c, h): Rgb` | Converts OKLCH into Display P3 primaries for wide-gamut output. |
| `srgbToLinear` / `linearToSrgb` | `apply(r, g, b): Rgb` | sRGB companding transfer functions in each direction. |
| `gamutMapSrgb` | `apply(l, c, h): GamutMapResult` | Reduces OKLCH chroma along a hue line until the color fits the sRGB gamut. |

### Contrast & accessibility

| Primitive | Signature | Description |
|---|---|---|
| `luminance` | `apply(color: ColorRecord): number` | Relative luminance per WCAG 2.1. |
| `contrastWcag21` | `apply(a, b: ColorRecord): number` | WCAG 2.1 contrast ratio between two colors. |
| `contrastApca` | `apply(text, background: ColorRecord): number` | APCA (WCAG 3 draft) perceptual contrast (Lc). |
| `contrastText` | `apply(background: ColorRecord, threshold = 0.179): ColorRecord` | Picks black or white text for a given background by luminance threshold. |
| `ensureContrast` | `apply(...)` | Iteratively nudges a foreground color's OKLCH lightness until it clears a target contrast ratio against a background. Backs `enforce:contrast` and the VS Code modifier pass. |
| `deltaE2000` | `apply(a, b: ColorRecord): number` | CIEDE2000 perceptual color-difference metric. |

### Mixing & adjustment

| Primitive | Signature | Description |
|---|---|---|
| `mixOklch` / `mixSrgb` / `mixHsl` | `apply(a, b: ColorRecord, t: number): ColorRecord` | Linear-interpolate two colors in the named color space. |
| `lighten` / `darken` | `apply(color: ColorRecord, deltaL: number): ColorRecord` | Shifts OKLCH lightness by a delta, clamped to `[0, 1]`. |
| `saturate` / `desaturate` | `apply(color: ColorRecord, deltaC: number): ColorRecord` | Shifts OKLCH chroma by a delta, clamped to `[0, 0.5]`. |
| `hueShift` | `apply(color: ColorRecord, degrees: number): ColorRecord` | Rotates OKLCH hue by the given degrees. |

### Clustering

| Primitive | Signature | Description |
|---|---|---|
| `clusterMedianCut` | `apply(colors, k: number): ColorRecord[]` | Reduces a color set to `k` representative colors via unweighted median-cut. |
| `clusterMedianCutWeighted` | `apply(colors, k: number): ColorRecord[]` | Median-cut variant that weights bins by pixel/sample frequency; backs `gallery:extract` and `clamp:count`. |
| `clusterDeltaEMerge` | `apply(colors, k: number): ColorRecord[]` | Merges colors within a perceptual (`deltaE2000`) distance threshold down to `k` clusters. |

### Utility

| Primitive | Signature | Description |
|---|---|---|
| `clamp` | `apply(min, max, v: number): number` | Generic numeric clamp. |
| `clamp01` | `apply(v: number): number` | Clamps to `[0, 1]`, used throughout the channel/lightness/chroma math. |
| `colorRecordFactory` | — | Builds a fully-populated `ColorRecord` (rgb, oklch, hex, and optional `displayP3`) from any single representation. |
