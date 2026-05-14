import type { OklchInterface } from '../types/index.ts';

/**
 * CSS Color Module Level 4 §13.2.2 gamut-mapping algorithm — reduces
 * OKLCH chroma along a constant L+H ray until the color falls inside the
 * sRGB gamut, preserving perceived lightness and hue.
 *
 * Source: https://www.w3.org/TR/css-color-4/#binsearch (the "MINDE"
 * binary search; the spec calls it "css gamut mapping algorithm").
 *
 * Algorithm:
 *  1. Convert the input OKLCH to linear sRGB (Björn Ottosson matrices,
 *     same chain as {@link import('./OklchToRgbRaw.ts').OklchToRgbRaw}).
 *  2. If every linear-sRGB channel is in `[0, 1]`, the color is in-gamut
 *     — return it untouched with `inGamut: true`.
 *  3. If `l ≤ 0`, return black. If `l ≥ 1`, return white.
 *  4. Otherwise binary-search the chroma between `[0, c_original]`. At
 *     each midpoint, convert and check in-gamut; converge to within
 *     `JND_CHROMA` (0.02, per spec §13.2.2 step 7).
 *
 * Lightness `l` and hue `h` are preserved; only chroma `c` shrinks.
 *
 * Performance: ~6 iterations on average for a starting chroma ~0.3.
 * Each iteration does one OKLab→linear-sRGB matmul (10 multiplies + 6
 * adds + 3 cubes). Acceptable for the factory hot path.
 */
export class GamutMapSrgb {
  readonly 'name' = 'gamutMapSrgb';

  apply(l: number, c: number, h: number): GamutMapResultInterface {
    if (inSrgbGamut(l, c, h)) {
      return { 'l': l, 'c': c, 'h': h, 'inGamut': true };
    }
    if (l <= 0) {
      return { 'l': 0, 'c': 0, 'h': h, 'inGamut': false };
    }
    if (l >= 1) {
      return { 'l': 1, 'c': 0, 'h': h, 'inGamut': false };
    }

    // Binary search chroma in [0, c]. Invariant: `lo` always in-gamut,
    // `hi` always out-of-gamut. Stops when the interval shrinks below
    // the just-noticeable-difference chroma threshold.
    const JND_CHROMA = 0.02;
    let lo = 0;
    let hi = c;
    while (hi - lo > JND_CHROMA) {
      const mid = (lo + hi) / 2;
      if (inSrgbGamut(l, mid, h)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return { 'l': l, 'c': lo, 'h': h, 'inGamut': false };
  }
}

export interface GamutMapResultInterface extends OklchInterface {
  /** `true` when the input OKLCH was already inside sRGB (no chroma reduction applied). */
  readonly inGamut: boolean;
}

/**
 * UNCLAMPED OKLCH → linear sRGB check. A channel outside `[0, 1]`
 * indicates the point is outside the sRGB gamut. Encapsulated here so
 * the gamut-map binary search doesn't allocate `RgbInterface` records.
 */
function inSrgbGamut(l: number, c: number, h: number): boolean {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  let x = l + 0.3963377774 * a + 0.2158037573 * b;
  let y = l - 0.1055613458 * a - 0.0638541728 * b;
  let z = l - 0.0894841775 * a - 1.291485548  * b;

  x = x * x * x;
  y = y * y * y;
  z = z * z * z;

  const rLin = +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
  const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
  const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z;

  // Allow a tiny epsilon — floating-point error shouldn't kick a barely
  // in-gamut color out into the binary-search branch.
  const eps = 1e-6;
  return (
    rLin >= -eps && rLin <= 1 + eps &&
    gLin >= -eps && gLin <= 1 + eps &&
    bLin >= -eps && bLin <= 1 + eps
  );
}

/** Singleton instance registered as the `gamutMapSrgb` math primitive. */
export const gamutMapSrgb = new GamutMapSrgb();
