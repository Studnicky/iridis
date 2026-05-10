import type { MathPrimitiveInterface, RgbInterface } from '../types/index.ts';

function gammaDecode(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function p3Encode(v: number): number {
  if (v <= 0.0030186) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/**
 * Math primitive that maps gamma-encoded sRGB into Display P3 space
 * (D65 white point). Used by emitters targeting wide-gamut displays.
 * Out-of-gamut intermediate values are clipped to [0,1] before re-encoding.
 */
export class SrgbToDisplayP3 implements MathPrimitiveInterface {
  readonly 'name' = 'srgbToDisplayP3';

  apply(...args: readonly unknown[]): RgbInterface {
    const [r, g, b] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('SrgbToDisplayP3.apply: expected (r: number, g: number, b: number)');
    }

    const rl = gammaDecode(r);
    const gl = gammaDecode(g);
    const bl = gammaDecode(b);

    const p3r = p3Encode(Math.max(0, Math.min(1,  0.8224621 * rl + 0.1775380 * gl + 0.0000000 * bl)));
    const p3g = p3Encode(Math.max(0, Math.min(1,  0.0331941 * rl + 0.9668058 * gl + 0.0000001 * bl)));
    const p3b = p3Encode(Math.max(0, Math.min(1,  0.0170827 * rl + 0.0723968 * gl + 0.9105206 * bl)));

    return { 'r': p3r, 'g': p3g, 'b': p3b };
  }
}

/** Singleton instance registered as the `srgbToDisplayP3` math primitive. */
export const srgbToDisplayP3 = new SrgbToDisplayP3();
