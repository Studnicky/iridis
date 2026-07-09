import type { RgbInterfaceType } from '../types/index.ts';

function encode(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

class LinearToSrgb {
  readonly 'name' = 'linearToSrgb';

  apply(r: number, g: number, b: number): RgbInterfaceType {
    return {
      'b': encode(b),
      'g': encode(g),
      'r': encode(r)
    };
  }
}

/** Singleton instance registered as the `linearToSrgb` math primitive. */
export const linearToSrgb = new LinearToSrgb();
