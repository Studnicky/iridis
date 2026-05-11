import type { MathPrimitiveInterface, RgbInterface } from '../types/index.ts';

function encode(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/**
 * Math primitive that gamma-encodes linear-light values into the sRGB
 * transfer curve. Inverse of {@link SrgbToLinear}.
 */
export class LinearToSrgb implements MathPrimitiveInterface {
  readonly 'name' = 'linearToSrgb';

  apply(...args: readonly unknown[]): RgbInterface {
    const [r, g, b] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('LinearToSrgb.apply: expected (r: number, g: number, b: number)');
    }
    return {
      'r': encode(r),
      'g': encode(g),
      'b': encode(b),
    };
  }
}

/** Singleton instance registered as the `linearToSrgb` math primitive. */
export const linearToSrgb = new LinearToSrgb();
