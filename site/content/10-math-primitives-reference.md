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

## How contrast is measured and enforced

`contrastWcag21` is a WCAG 2.1 luminance ratio: it computes relative luminance from gamma-decoded sRGB for each color, then divides the lighter luminance by the darker, `(L₁ + 0.05) / (L₂ + 0.05)`. The result ranges from `1.0` (no contrast) to `21.0` (black on white). Compliance reads that ratio against two fixed tiers — `AA` at 4.5:1 (body text), `AAA` at 7.0:1 (high-stakes body text) — with large text and non-text UI elements (borders, focus rings) using a lower 3.0:1 threshold.

WCAG 2.1's model is a 1990s simplification: it underweights blue-on-black and overweights bright-on-white. `contrastApca` implements APCA (Accessible Perceptual Contrast Algorithm, the metric under development for WCAG 3) as a swappable alternative. Where WCAG produces one ratio, APCA produces a signed `Lc` value in roughly `[-108, +108]`: positive means light background, negative means dark, and the magnitude is what you compare against a threshold (≥75 body text, ≥60 fluent text, ≥45 large text/headlines, ≥30 non-text/icons). APCA uses separate exponents for foreground and background luminance and a perceptual lightness curve closer to OKLCH, so it's stricter on dark-on-dark pairs and more permissive on saturated-on-light pairs than the WCAG ratio would suggest. The full formula walkthroughs for both algorithms are below, in [Contrast & accessibility](#contrast--accessibility).

These numbers aren't just measured, they're enforced before a palette ships. A role schema declares `contrastPairs` — foreground role, background role, a minimum ratio (or Lc magnitude), and an algorithm — and every declared pair is a hard contract. The `enforce:contrast` pipeline stage walks each pair and, for any foreground that falls short, calls `ensureContrast`: it checks whether the foreground is darker or lighter than its background, then nudges OKLCH lightness in that direction in steps of `0.02`, re-testing the ratio after each step, for up to 50 steps. Hue and chroma are untouched, so the adjusted color still looks like the one picked, it just reads against its background too. If a role's declared `lightnessRange` can't reach the threshold, the engine records the closest reachable approximation instead of failing silently — a design constraint and an accessibility constraint in genuine conflict, surfaced as a measurable gap rather than a broken palette shipped unnoticed.

One layer this doesn't cover: color vision deficiency simulation. The optional `enforce:cvdSimulate` stage simulates protanopia, deuteranopia, tritanopia, and achromatopsia using Brettel-Viénot matrices in linear sRGB, recomputes each pair's WCAG contrast under simulation, and warns when it drops meaningfully below the original. It's advisory only — it doesn't rewrite roles the way `enforce:contrast` does, because hue selection under CVD is a design decision the engine leaves to you.

## Real implementations

Three of the more interesting primitives, straight from source:

`luminance` is the WCAG 2.1 relative-luminance calculation that every contrast primitive builds on:

<<< @/packages/core/src/math/Luminance.ts

`contrastWcag21` composes `luminance` into the standard `(lighter + 0.05) / (darker + 0.05)` ratio:

<<< @/packages/core/src/math/ContrastWcag21.ts

`ensureContrast` is the least trivial of the set — it walks OKLCH lightness in a bounded loop until a foreground clears a target ratio against a background, preserving the color's original gamut (sRGB vs. wide-gamut) on the way back out:

<<< @/packages/core/src/math/EnsureContrast.ts

## Storage model: OKLCH-first ColorRecord

Every color iridis touches is stored internally as a `ColorRecord`, and OKLCH is the primary representation — RGB, hex, and (conditionally) Display P3 are cached projections derived from it, not independent sources of truth. The engine reasons in OKLCH when it mixes, lightens, darkens, or nudges a color for contrast; the other slots exist for output, not computation.

The `rgb` and `hex` slots are always sRGB-safe. When a color's OKLCH coordinates land outside the sRGB gamut, they're gamut-mapped along constant lightness and hue (CSS Color 4 §13.2.2) before being written into those slots — a lossy step. The `displayP3` slot exists to preserve wide-gamut fidelity in that case; it stays `undefined` whenever the input color was already fully representable in sRGB.

Two properties fall out of storing OKLCH first. Mixing two colors in OKLCH (`mixOklch`) produces a perceptually centered midpoint, where mixing in sRGB across a warm/cool hue boundary tends to produce muddy browns. And contrast enforcement (`ensureContrast`) nudges the `oklch.l` field in fixed steps because lightness is perceptually linear there — each step is a consistent perceived change, so the nudge converges predictably instead of overshooting.

### Color-space conversion

Hex is three (or four, with alpha) sRGB bytes written as hex digits, each `00`–`ff`. iridis only accepts the full six-digit `#rrggbb` form, plus an optional eight-digit `#rrggbbaa` with alpha — three- and four-digit shorthand is rejected outright. Converting to floating-point sRGB divides each byte by 255 (e.g. `#3b82f6` → `r = 0x3b / 255 = 0.231`); the reverse multiplies by 255, rounds, and pads to two digits, and alpha is tracked separately on the record rather than folded into the hex string.

RGB as iridis exposes it is gamma-corrected sRGB — what a hex string encodes, what gets painted to a `<canvas>`, what a CSS color declares. It is not linear light. Whenever physical light needs to be added — relative luminance for WCAG, the path into OKLCH — the gamma-corrected value is first decoded to linear:

```
v_linear = v / 12.92                     if v ≤ 0.04045
         = ((v + 0.055) / 1.055) ^ 2.4    otherwise
```

HSV re-parameterizes the same sRGB triple as an angle, a saturation, and a value rather than three intensities — useful for a picker but not perceptually uniform: equal steps in H or S don't correspond to equal perceived steps in color, unlike OKLCH. Reading it out of RGB is a max/min extraction: `V = max(R, G, B)`, `S = (max − min) / max`, and H comes from which channel held the maximum. iridis ships no `hsvToRgb` pipeline primitive — HSV lives entirely in picker UI, round-tripping through hex on every edit.

CMYK models four-color print: each channel is the percentage of ink laid on a white substrate. A naive subtractive conversion would set `C = 1 − R`, `M = 1 − G`, `Y = 1 − B`, but stacking three saturated inks to render a dark neutral wastes ink and shifts hue, so K (black) is pulled out as the shared minimum first:

```
K = 1 − max(R, G, B)
C = (1 − R − K) / (1 − K)
M = (1 − G − K) / (1 − K)
Y = (1 − B − K) / (1 − K)
```

This is a browser-side approximation with no ICC profile applied — accurate enough for a picker's CMYK readout, not for a press. iridis exports no CMYK pipeline primitive and accepts no CMYK input; it's a numeric readout only.

OKLCH is the polar form of Björn Ottosson's Oklab space: lightness `L` stays as-is, and the `(a, b)` chromaticity plane becomes chroma `C = √(a² + b²)` and hue `h = atan2(b, a)`. The forward conversion chain is sRGB (gamma) → linear sRGB → LMS cone responses → cube-root non-linearity → Oklab → polar form. Because `L` is perceptually linear and independent of hue, rotating `h` holds perceived lightness constant — HSL can't make that guarantee, since its lightness is just the average of the max and min RGB channels rather than a perceptual quantity. This is why contrast enforcement, palette family expansion, and color mixing throughout iridis all operate on the OKLCH slot rather than RGB or HSV.

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

WCAG 2.1's ratio compares relative luminance `Y` — a Rec. 709-weighted sum of each color's linear-light sRGB channels — for both colors in a pair:

```
Y = 0.2126·R_linear + 0.7152·G_linear + 0.0722·B_linear
ratio = (max(Y₁, Y₂) + 0.05) / (min(Y₁, Y₂) + 0.05)
```

The `+ 0.05` flare term models ambient screen reflectance and keeps the ratio finite even against pure black; the result lands on `[1, 21]`. It's symmetric — WCAG doesn't distinguish foreground from background the way APCA below does — and body text needs 4.5:1 at AA / 7:1 at AAA, while large text and non-text UI components need less (3:1 AA, 4.5:1 AAA for large text).

APCA (the metric under development for WCAG 3) addresses two gaps in that ratio: it weights text and background luminance with different exponents (0.56 vs 0.65) because the eye is asymmetric between light-on-dark and dark-on-light text, and it applies a soft-clamp polynomial near black to suppress runaway sensitivity to tiny absolute luminances:

```
Y_soft = Y                              if Y ≥ 0.022
       = Y + (0.022 − Y)^1.414          otherwise
```

The output, `Lc`, is signed rather than a plain ratio — positive means light background with dark text, negative means dark background with light text, and the sign is exactly the polarity information WCAG's symmetric ratio throws away. Thresholds scale with use: small body text needs `|Lc| ≥ 75`, large headline text only `≥ 45`. A role schema opts a pair into APCA explicitly with `algorithm: 'apca'` on the contrast pair.

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
