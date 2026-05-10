# RGB

RGB describes a color as a triple of red, green, and blue intensities. iridis stores RGB in floating-point form on the unit interval `[0, 1]`, in the sRGB color space.

## sRGB

sRGB is the IEC 61966-2-1 standard color space used by the open web, most consumer displays, and every common image format. It defines:

- A set of primaries (chromaticities for red, green, blue).
- A reference white (D65).
- A non-linear transfer function (gamma encoding) that compresses linear light for storage.

When a hex string `#7c3aed` is read into iridis, the bytes are interpreted as gamma-encoded sRGB. Each byte is divided by 255 to produce a value in `[0, 1]`. The result is a gamma-corrected sRGB triple — not linear light.

## Gamma-corrected vs linear

The sRGB transfer function is piecewise. The decode (gamma-corrected → linear) is:

```
v_linear = v / 12.92                          if v ≤ 0.04045
         = ((v + 0.055) / 1.055) ^ 2.4         otherwise
```

The encode (linear → gamma-corrected) is the inverse:

```
v = 12.92 · v_linear                          if v_linear ≤ 0.0031308
  = 1.055 · v_linear ^ (1/2.4) − 0.055        otherwise
```

Linear sRGB is required whenever physical light addition matters: relative luminance for WCAG, CIE XYZ conversion en route to OKLCH, and any blending model that claims to be perceptually correct.

Gamma-corrected sRGB is what gets written to a hex string, sent to a `<canvas>`, or set as a CSS color.

## Conversion to OKLCH

The path is sRGB → linear sRGB → CIE XYZ-like cone responses → cube-root non-linearity → Oklab → polar form (OKLCH). The matrices are encoded in `ColorRecordFactory` (`packages/core/src/math/ColorRecordFactory.ts`); see [OKLCH](./oklch) for the full pipeline.

## Math primitives

| Primitive | File | Behaviour |
|---|---|---|
| `srgbToLinear` | `packages/core/src/math/SrgbToLinear.ts` | gamma-decodes a triple of sRGB channels into linear sRGB |
| `linearToSrgb` | `packages/core/src/math/LinearToSrgb.ts` | gamma-encodes a triple of linear sRGB channels back to sRGB |
| `rgbToOklch` | `packages/core/src/math/RgbToOklch.ts` | builds a `ColorRecord` from three sRGB channels via `ColorRecordFactory.fromRgb` |
| `oklchToRgb` | `packages/core/src/math/OklchToRgb.ts` | builds a `ColorRecord` from L, C, h via `ColorRecordFactory.fromOklch` |
| `srgbToDisplayP3` | `packages/core/src/math/SrgbToDisplayP3.ts` | gamut-maps from sRGB primaries to Display P3 primaries |
| `displayP3ToSrgb` | `packages/core/src/math/DisplayP3ToSrgb.ts` | gamut-maps from Display P3 back to sRGB |
| `mixSrgb` | `packages/core/src/math/MixSrgb.ts` | linear interpolation in gamma-corrected sRGB (fast, perceptually crude) |

`luminance` (`packages/core/src/math/Luminance.ts`) and the WCAG / APCA contrast primitives all depend on the sRGB → linear decode internally.

## Where it appears

- `intake:rgb` (`packages/core/src/tasks/intake/IntakeRgb.ts`) accepts `{r, g, b}` objects from `input.colors`.
- Every `ColorRecord` carries an `rgb` field alongside `oklch` and `hex`. Consumers that need to output a CSS color or a numeric byte triple read from this field directly.
- The contrast plugin reads `rgb` to compute relative luminance for both WCAG and APCA without reaching back through OKLCH.
