import type { RgbInterface } from '../model/types.ts';

export class LinearToSrgb {
  readonly 'name' = 'linearToSrgb';

  apply(r: number, g: number, b: number): RgbInterface {
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
