import type { MathPrimitiveInterface, RgbInterface } from '../types/index.ts';

export class LinearToSrgb implements MathPrimitiveInterface {
  readonly 'name' = 'linearToSrgb';

  apply(...args: readonly unknown[]): RgbInterface {
    const [r, g, b] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('LinearToSrgb.apply: expected (r: number, g: number, b: number)');
    }
    return {
      'r': this.encode(r),
      'g': this.encode(g),
      'b': this.encode(b),
    };
  }

  private encode(v: number): number {
    if (v <= 0.0031308) {
      return 12.92 * v;
    }
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  }
}

export const linearToSrgb = new LinearToSrgb();
