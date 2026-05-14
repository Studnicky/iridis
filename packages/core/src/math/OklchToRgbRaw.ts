import type { RgbInterface } from '../types/index.ts';
import { clamp01 } from './Clamp01.ts';
import { linearToSrgb } from './LinearToSrgb.ts';

/**
 * OKLCH → linear sRGB → gamma sRGB conversion that returns RGB without
 * allocating a {@link import('../types/index.ts').ColorRecordInterface}.
 * Hot path for `EnsureContrast`'s scalar loop and an internal step inside
 * {@link import('./ColorRecordFactory.ts').ColorRecordFactory.fromOklch}.
 * Uses the same Björn Ottosson OKLab matrices and gamma curve as the full
 * record factory; the only difference is the absence of record wrapping.
 * Inputs are not clamped — callers iterating on a scalar L value are
 * expected to clamp themselves before invoking.
 */
export class OklchToRgbRaw {
  readonly 'name' = 'oklchToRgbRaw';

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

    const rLin = +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
    const gLin = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
    const bLin = -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z;

    const encoded = linearToSrgb.apply(rLin, gLin, bLin);

    return {
      'r': clamp01.apply(encoded.r),
      'g': clamp01.apply(encoded.g),
      'b': clamp01.apply(encoded.b),
    };
  }
}

/** Singleton instance registered as the `oklchToRgbRaw` math primitive. */
export const oklchToRgbRaw = new OklchToRgbRaw();
