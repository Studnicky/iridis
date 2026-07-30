import type { RgbInterfaceType } from '../types/index.ts';

class GammaEncode {
  static channel(v: number): number {
    if (v <= 0.0031308) {
      return 12.92 * v;
    }
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  }
}

class LinearToSrgb {
  readonly 'name' = 'linearToSrgb';

  apply(r: number, g: number, b: number): RgbInterfaceType {
    return {
      'b': GammaEncode.channel(b),
      'g': GammaEncode.channel(g),
      'r': GammaEncode.channel(r)
    };
  }
}

/** Singleton instance registered as the `linearToSrgb` math primitive. */
export const linearToSrgb = new LinearToSrgb();
