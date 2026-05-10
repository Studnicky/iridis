# HSV

HSV (hue, saturation, value) is a cylindrical re-parameterisation of sRGB. It exists because flat RGB sliders are a poor interface for picking a color by eye, moving along the hue axis at constant saturation and value is the natural action a human takes when they want "the same color, but more orange".

## Coordinates

| Channel | Range | Meaning |
|---|---|---|
| H (hue) | `[0, 360)` degrees | angle around the color wheel, 0 = red, 120 = green, 240 = blue |
| S (saturation) | `[0, 1]` or `[0, 100]` percent | distance from the central grey axis at the current hue and value |
| V (value) | `[0, 1]` or `[0, 100]` percent | maximum of the three RGB channels at that point |

HSV is not perceptually uniform. Equal steps in H or S do not produce equal perceived steps in color. It is also not a wide-gamut or HDR-aware space. It is a convenient projection of sRGB.

## Conversion to RGB

The standard algorithm partitions the hue circle into six 60-degree sectors and selects which two of the three RGB channels are at extremes:

```
H' = H / 60
i  = floor(H') mod 6
f  = H' − floor(H')
p  = V · (1 − S)
q  = V · (1 − f · S)
t  = V · (1 − (1 − f) · S)

i = 0:  (R, G, B) = (V, t, p)
i = 1:  (R, G, B) = (q, V, p)
i = 2:  (R, G, B) = (p, V, t)
i = 3:  (R, G, B) = (p, q, V)
i = 4:  (R, G, B) = (t, p, V)
i = 5:  (R, G, B) = (V, p, q)
```

The result is gamma-corrected sRGB. The reverse direction reads the maximum and minimum of the three channels: V = max, S = (max − min) / max, and H comes from which channel held the maximum.

## Math primitives

iridis does not export an `hsvToRgb` math primitive. HSV exists in iridis as a picker-side concern, not a pipeline concern. Conversions live inline in the picker component and round-trip through hex on every change.

The pipeline equivalent for an analogous cylindrical space is `hslToRgb` and `rgbToHsl` (`packages/core/src/math/HslToRgb.ts`, `packages/core/src/math/RgbToHsl.ts`), which use HSL, closely related but with a different definition of the lightness axis.

## Where it appears

- `IridisPicker.vue` (`docs/.vitepress/theme/components/IridisPicker.vue`) holds H, S, V as the canonical state of the picker. The visual square shows S × V at the current H, the strip below shows H, and every numeric tab (HEX, RGB, HSV, CMYK, OKLCH) reads from those three refs.
- The picker emits a hex string on every edit. The pipeline never sees HSV; it sees the hex.
