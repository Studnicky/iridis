import type { RgbInterface } from '../types/index.ts';

function encode(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export class LinearToSrgb {
  readonly 'name' = 'linearToSrgb';

  apply(r: number, g: number, b: number): RgbInterface {
    return {
      'r': encode(r),
      'g': encode(g),
      'b': encode(b),
    };
  }
}

/** Singleton instance registered as the `linearToSrgb` math primitive. */
export const linearToSrgb = new LinearToSrgb();
