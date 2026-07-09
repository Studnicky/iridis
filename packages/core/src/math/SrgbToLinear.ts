import type { RgbInterfaceType } from '../types/index.ts';

function decode(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

class SrgbToLinear {
  readonly 'name' = 'srgbToLinear';

  apply(r: number, g: number, b: number): RgbInterfaceType {
    return {
      'b': decode(b),
      'g': decode(g),
      'r': decode(r)
    };
  }
}

/** Singleton instance registered as the `srgbToLinear` math primitive. */
export const srgbToLinear = new SrgbToLinear();
