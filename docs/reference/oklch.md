---
title: OKLCH
description: The perceptually uniform polar form of Oklab that every iridis ColorRecord carries — coordinates, why the pipeline reasons in this space, and the sRGB conversion chain
---

# OKLCH

OKLCH is the canonical color space inside iridis. Every `ColorRecord` carries OKLCH coordinates regardless of the input format. The pipeline reasons about lightness, chroma, and hue in this space.

## Coordinates

| Channel | Range | Meaning |
|---|---|---|
| L (lightness) | `[0, 1]` | perceptual lightness, 0 = black, 1 = white |
| C (chroma) | `[0, ~0.5]` | distance from the neutral grey axis |
| h (hue) | `[0, 360)` degrees | angle on the chromaticity plane |

OKLCH is the polar form of Oklab, Björn Ottosson's perceptually uniform color space (2020). The Cartesian form has axes (L, a, b); the polar form keeps L and replaces (a, b) with chroma C = √(a² + b²) and hue h = atan2(b, a). Polar coordinates are easier to manipulate semantically, "shift hue" and "raise chroma" are coordinate operations rather than vector projections.

## Why OKLCH

Three properties matter for a palette engine:

1. **Perceptual uniformity.** Equal numeric steps in L produce roughly equal perceived steps in lightness. This is what HSL and HSV fail at, and it is what allows `lighten` and `darken` to behave predictably across hues.
2. **Independent hue and lightness.** Rotating h holds lightness constant. In HSL, sliding hue while holding lightness can produce visibly different brightness because HSL's L is the average of max and min RGB channels rather than perceived luminance.
3. **CSS support.** `oklch(l c h)` is a Level 4 CSS Color value. Modern browsers consume it natively, which means the same coordinates the engine reasons about can be written directly to a stylesheet without round-tripping through sRGB.

These properties make every other primitive simpler. Contrast enforcement, family expansion, mix, lerp, and the v2 vector-space framing all assume perceptual uniformity and independent axes.

## Conversion

OKLCH ↔ RGB is implemented inline in `ColorRecordFactory` (`packages/core/src/math/ColorRecordFactory.ts`). The forward direction is:

```
sRGB (gamma)  →  linear sRGB  →  LMS cone responses (matrix M₁)
              →  cube-root non-linearity
              →  Oklab (matrix M₂)
              →  OKLCH (polar form)
```

The matrices and the cube-root step are Ottosson's published constants. The reverse path inverts every step in order: polar → Oklab → cube → linear sRGB → gamma encode.

Hue is computed with `atan2(b, a)` and normalised to `[0, 360)`. Chroma is clamped to `[0, 0.5]`; values above that are out of the sRGB gamut and the gamma-encoded output is clamped to `[0, 1]` per channel.

## Math primitives

| Primitive | File | Behaviour |
|---|---|---|
| `oklchToRgb` | `packages/core/src/math/OklchToRgb.ts` | builds a `ColorRecord` from L, C, h via `ColorRecordFactory.fromOklch` |
| `rgbToOklch` | `packages/core/src/math/RgbToOklch.ts` | builds a `ColorRecord` from R, G, B via `ColorRecordFactory.fromRgb` |
| `mixOklch` | `packages/core/src/math/MixOklch.ts` | linear interpolation in OKLCH (perceptual) |
| `lighten` | `packages/core/src/math/Lighten.ts` | adjusts L upward |
| `darken` | `packages/core/src/math/Darken.ts` | adjusts L downward |
| `saturate` | `packages/core/src/math/Saturate.ts` | adjusts C upward |
| `desaturate` | `packages/core/src/math/Desaturate.ts` | adjusts C downward |
| `hueShift` | `packages/core/src/math/HueShift.ts` | rotates h |
| `deltaE2000` | `packages/core/src/math/DeltaE2000.ts` | perceptual distance between two `ColorRecord` values |
| `clampOklch` | `packages/core/src/tasks/clamp/ClampOklch.ts` | task that clamps OKLCH coordinates to a configured range |

## Where it appears

- Every `ColorRecord` has an `oklch: { l, c, h }` field. This is the field the engine reads when it needs to reason about the color.
- `intake:oklch` (`packages/core/src/tasks/intake/IntakeOklch.ts`) accepts `{l, c, h}` objects directly.
- `resolve:roles` matches colors to semantic roles using OKLCH distance.
- `expand:family` derives related roles from a source role by offsetting L and C ranges in OKLCH.
- `enforce:contrast` walks contrast pairs and nudges foreground roles by adjusting L in OKLCH until the WCAG or APCA threshold is met.
- `emit:cssVars` can emit values as `oklch(l c h)` for direct CSS consumption.
