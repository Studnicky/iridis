import type { MathPrimitiveInterface, RgbInterface } from '../types/index.ts';

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

export const srgbToLinear = new SrgbToLinear();
