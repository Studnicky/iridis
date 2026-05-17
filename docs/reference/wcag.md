---
title: WCAG 2.1
description: The luminance-ratio contrast algorithm iridis uses by default — Rec. 709 coefficients, the 0.05 flare term, and AA/AAA threshold tables for text and UI
---

# WCAG 2.1

The Web Content Accessibility Guidelines 2.1 contrast algorithm produces a single ratio between two colors based on their relative luminance. It is the default contrast metric used by `enforce:contrast`.

## Relative luminance

Each color's relative luminance Y is the dot product of its linear sRGB channels with the Rec. 709 luminance coefficients:

```
Y = 0.2126 · R_linear + 0.7152 · G_linear + 0.0722 · B_linear
```

The coefficients reflect the photopic response of the human eye to the sRGB primaries: green dominates, red contributes about a third as much, blue contributes least.

The linear values are produced by the standard sRGB inverse transfer function:

```
v_linear = v / 12.92                          if v ≤ 0.04045
         = ((v + 0.055) / 1.055) ^ 2.4        otherwise
```

Both `Luminance` (`packages/core/src/math/Luminance.ts`) and `ContrastWcag21` (`packages/core/src/math/ContrastWcag21.ts`) inline this decode rather than calling `srgbToLinear`, since the call frequency is high enough that the indirection is measurable.

## Contrast ratio

Given two relative luminances Y₁ and Y₂:

```
ratio = (max(Y₁, Y₂) + 0.05) / (min(Y₁, Y₂) + 0.05)
```

The `+ 0.05` flare term models ambient screen reflectance and prevents the ratio from going to infinity when one of the colors is pure black. The result lies in `[1, 21]`, 1:1 for two identical colors, 21:1 for pure black on pure white.

The ratio is symmetric. WCAG 2.1 does not distinguish text from background.

## Thresholds

| Surface | Ratio | Level |
|---|---|---|
| Body text under 18 pt (or under 14 pt bold) | 4.5 : 1 | AA |
| Large text at or above 18 pt (or 14 pt bold) | 3.0 : 1 | AA |
| Body text | 7.0 : 1 | AAA |
| Large text | 4.5 : 1 | AAA |
| Non-text UI components, focus indicators | 3.0 : 1 | AA |

Logos, decorative imagery, and disabled states are exempt from the contrast requirements.

## Math primitive

`contrastWcag21` is exported as a singleton from `@studnicky/iridis` (`packages/core/src/math/ContrastWcag21.ts`) and called directly:

```ts
import { contrastWcag21 } from '@studnicky/iridis';

const ratio = contrastWcag21.apply(foreground, background);
```

Both arguments are `ColorRecord` instances. The primitive reads the `rgb` field of each (sRGB-safe, gamut-mapped if the source OKLCH lay outside sRGB) and returns a number on `[1, 21]`.

## Where it appears

- `enforce:contrast` (`packages/core/src/tasks/enforce/EnforceContrast.ts`) walks `input.roles.contrastPairs` and `input.contrast.extra`. For each pair whose `algorithm` is `'wcag21'` (the default) it calls `contrastWcag21.apply(fg, bg)` and lifts the foreground's L coordinate in OKLCH until the configured `minRatio` is met.
- `enforce:wcagAA` and `enforce:wcagAAA` in the contrast plugin (`packages/contrast/src/tasks/`) are convenience wrappers that apply the AA and AAA threshold tables to declared pairs without each pair having to repeat the ratio.
- `enforce:cvdSimulate` re-evaluates the same `contrastWcag21` math against simulated protanopia, deuteranopia, and tritanopia versions of each pair and records warnings when the simulated ratio drops more than 1.0 below the original.
