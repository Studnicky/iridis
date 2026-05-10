# APCA

APCA (Accessible Perceptual Contrast Algorithm) is a perceptually weighted contrast metric developed by Andrew Somers, intended as a successor to WCAG 2.x luminance contrast. It is the algorithm being evaluated for inclusion in WCAG 3. iridis ships APCA-W3 0.0.98G-4g (`packages/core/src/math/ContrastApca.ts`).

## Why APCA

WCAG 2.1's ratio is symmetric and treats foreground and background interchangeably. In practice, dark text on a light background and light text on a dark background do not need the same contrast to read equally well — the eye is asymmetric. WCAG 2.1 is also a poor predictor at the dark end of the scale, where small differences in luminance compress into large differences in ratio.

APCA addresses both. It uses different exponents for text and background, returns a signed value that records polarity, and produces a number that maps more directly to the practical question "is this text readable at this size and weight".

## Lc

The output is Lc — *lightness contrast* — a signed value, conventionally reported with a magnitude on roughly `[0, 108]`.

| Lc sign | Meaning |
|---|---|
| Positive | light background, dark text |
| Negative | dark background, light text |
| Zero | below the noise floor; treated as no readable contrast |

Magnitudes:

| Surface | Lc magnitude |
|---|---|
| Small body text (under 14 pt thin / 12 pt regular) | ≥ 75 |
| Fluent body text (normal sizes) | ≥ 60 |
| Large text and headlines | ≥ 45 |
| Non-text icons and graphical components | ≥ 30 |

## The math

APCA computes per-side luminance with separate exponents, then takes the difference and applies clamping and scaling.

### Soft clamp

For each side, Y_soft applies a polynomial clamp at the dark end:

```
Y_soft = Y                                        if Y ≥ 0.022
       = Y + (0.022 − Y) ^ 1.414                   otherwise
```

The clamp suppresses runaway sensitivity to tiny absolute luminances near pure black.

### Asymmetric weighting

```
Y_text = 0.2126729 · R_lin^0.56  +  0.7151522 · G_lin^0.56  +  0.0721750 · B_lin^0.56
Y_bg   = 0.2126729 · R_lin^0.65  +  0.7151522 · G_lin^0.65  +  0.0721750 · B_lin^0.65
```

The exponents differ — 0.56 for text, 0.65 for background — which is what gives APCA its asymmetry. The Rec. 709 luminance coefficients are unchanged.

### Difference and scale

```
if bg_clamped > text_clamped:
    Lc = (bg_clamped^0.56 − text_clamped^0.57) · 1.14
    if Lc < 0.001:  return 0
    Lc = Lc − 0.027
else:
    Lc = (bg_clamped^0.62 − text_clamped^0.65) · 1.14
    if Lc > −0.001:  return 0
    Lc = Lc + 0.027

return Lc · 100
```

Two branches: one for normal-polarity (light bg, dark text), one for reverse-polarity (dark bg, light text). Each branch applies its own exponent pair and offset. The final multiply by 100 puts Lc on the conventional scale.

The constants in `ContrastApca.ts` (`SA98G_NORM_BG`, `SA98G_NORM_TXT`, `SA98G_CLAMP`, `SA98G_CLAMP_P`, `SA98G_SCALE`, `SA98G_LOW_CLIP`, `SA98G_OFFSET`) are the canonical APCA-W3 0.0.98G-4g values from the Myndex SAPC reference.

## Math primitive

`contrastApca` is registered in `mathBuiltins` (`packages/core/src/math/index.ts`) and called as:

```ts
const lc = ctx.math.invoke('contrastApca', text, background);
```

Both arguments are `ColorRecord` instances. The primitive reads the `rgb` field of each and returns a signed `Lc` value.

## Where it appears

- `enforce:contrast` (`packages/core/src/tasks/enforce/EnforceContrast.ts`) routes pairs whose `algorithm` is `'apca'` to `contrastApca` and uses the absolute value of `Lc` against the pair's `minRatio`.
- `enforce:apca` in the contrast plugin (`packages/contrast/src/tasks/`) provides a wrapper that applies APCA threshold tables to pairs without each pair restating the magnitude.
- A role schema selects APCA per pair:

```ts
contrastPairs: [
  { foreground: 'text', background: 'canvas', minRatio: 60, algorithm: 'apca' },
]
```
