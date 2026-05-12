import type { RgbInterface } from '../model/types.ts';

export class SrgbToLinear {
  readonly 'name' = 'srgbToLinear';

  apply(r: number, g: number, b: number): RgbInterface {
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
