import type { RgbInterface } from '../model/types.ts';

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
