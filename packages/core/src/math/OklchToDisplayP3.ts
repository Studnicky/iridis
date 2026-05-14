import type { RgbInterface } from '../types/index.ts';

/**
 * OKLCH → linear sRGB → linear Display-P3 → gamma-encoded Display-P3.
 *
 * Math sources (cited per CLAUDE.md):
 *  - OKLab → linear sRGB: Björn Ottosson, "A perceptual color space for
 *    image processing" (https://bottosson.github.io/posts/oklab/).
 *    Same matrices used by {@link import('./OklchToRgbRaw.ts').OklchToRgbRaw}.
 *  - Linear sRGB → linear Display-P3: CSS Color Module Level 4
 *    §17.6 "Sample code for color conversions"
 *    (https://www.w3.org/TR/css-color-4/#color-conversion-code). The
 *    composed matrix derives from `linearSrgb → XYZ-D65 → linearP3`.
 *  - Display-P3 transfer function: Apple/SMPTE — same piecewise gamma
 *    curve as sRGB (linear segment below 0.0031308, then `1.055·v^(1/2.4) − 0.055`).
 *
 * UNLIKE {@link import('./OklchToRgbRaw.ts').OklchToRgbRaw}, this primitive
 * DOES NOT clamp its output. Channels may exceed `[0, 1]` for colors that
 * fall outside the Display-P3 gamut as well. Callers handle that
 * downstream (the factory clips to `[0, 1]` after this returns; the
 * gamut-map step occurs against sRGB, not against P3).
 */
export class OklchToDisplayP3 {
  readonly 'name' = 'oklchToDisplayP3';

  apply(l: number, c: number, h: number): RgbInterface {
    const hRad = (h * Math.PI) / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);

    let x = l + 0.3963377774 * a + 0.2158037573 * b;
    let y = l - 0.1055613458 * a - 0.0638541728 * b;
    let z = l - 0.0894841775 * a - 1.291485548  * b;

    x = x * x * x;
    y = y * y * y;
    z = z * z * z;

    // OKLab LMS-cubed → linear sRGB (Björn Ottosson). Unclamped.
    const rLin = +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
    const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
    const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z;

    // Linear sRGB → linear Display-P3 (CSS Color 4 §17.6 sample code).
    // Composed matrix; primaries share the D65 white point.
    const p3rLin = 0.8224621 * rLin + 0.1775380 * gLin + 0.0000000 * bLin;
    const p3gLin = 0.0331941 * rLin + 0.9668058 * gLin + 0.0000001 * bLin;
    const p3bLin = 0.0170827 * rLin + 0.0723968 * gLin + 0.9105206 * bLin;

    // Display-P3 transfer function (same gamma curve as sRGB).
    return {
      'r': encodeP3(p3rLin),
      'g': encodeP3(p3gLin),
      'b': encodeP3(p3bLin),
    };
  }
}

function encodeP3(v: number): number {
  // Mirror sign so the curve works on out-of-gamut negative channels too.
  const sign = v < 0 ? -1 : 1;
  const abs  = Math.abs(v);
  if (abs <= 0.0031308) {
    return sign * 12.92 * abs;
  }
  return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
}

/** Singleton instance registered as the `oklchToDisplayP3` math primitive. */
export const oklchToDisplayP3 = new OklchToDisplayP3();
