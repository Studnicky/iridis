import type { MathPrimitiveInterface, RgbInterface } from '../types/index.ts';

function p3Decode(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function srgbEncode(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/**
 * Math primitive that maps Display P3 components back into sRGB.
 * Inverse of {@link SrgbToDisplayP3}; intermediate values are clipped
 * before re-encoding so out-of-sRGB-gamut P3 colors collapse to the
 * nearest sRGB primary rather than producing negative components.
 */
export class DisplayP3ToSrgb implements MathPrimitiveInterface {
  readonly 'name' = 'displayP3ToSrgb';

  apply(...args: readonly unknown[]): RgbInterface {
    const [r, g, b] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('DisplayP3ToSrgb.apply: expected (r: number, g: number, b: number)');
    }

    const rl = p3Decode(r);
    const gl = p3Decode(g);
    const bl = p3Decode(b);

    const sr = srgbEncode(Math.max(0, Math.min(1,  1.2249401 * rl - 0.2249404 * gl + 0.0000000 * bl)));
    const sg = srgbEncode(Math.max(0, Math.min(1, -0.0420569 * rl + 1.0420571 * gl - 0.0000001 * bl)));
    const sb = srgbEncode(Math.max(0, Math.min(1, -0.0196376 * rl - 0.0786361 * gl + 1.0982735 * bl)));

    return { 'r': sr, 'g': sg, 'b': sb };
  }
}

/** Singleton instance registered as the `displayP3ToSrgb` math primitive. */
export const displayP3ToSrgb = new DisplayP3ToSrgb();
