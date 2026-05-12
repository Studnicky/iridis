import type { RgbInterface } from '../types/index.ts';

function decode(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

export class SrgbToLinear {
  readonly 'name' = 'srgbToLinear';

  apply(r: number, g: number, b: number): RgbInterface {
    return {
      'r': decode(r),
      'g': decode(g),
      'b': decode(b),
    };
  }
}

/** Singleton instance registered as the `srgbToLinear` math primitive. */
export const srgbToLinear = new SrgbToLinear();
