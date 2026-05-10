import type { MathPrimitiveInterface, RgbInterface } from '../model/types.ts';

/**
 * Math primitive that converts gamma-encoded sRGB components into
 * linear-light values via the standard sRGB transfer function. Used by
 * any math that needs a physically meaningful linear space (luminance,
 * blending, gamut mapping).
 */
export class SrgbToLinear implements MathPrimitiveInterface {
  readonly 'name' = 'srgbToLinear';

  apply(...args: readonly unknown[]): RgbInterface {
    const [r, g, b] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('SrgbToLinear.apply: expected (r: number, g: number, b: number)');
    }
    return {
      'r': this.decode(r),
      'g': this.decode(g),
      'b': this.decode(b),
    };
  }

  private decode(v: number): number {
    if (v <= 0.04045) {
      return v / 12.92;
    }
    return Math.pow((v + 0.055) / 1.055, 2.4);
  }
}

/** Singleton instance registered as the `srgbToLinear` math primitive. */
export const srgbToLinear = new SrgbToLinear();
