import type { RgbInterface } from '../model/types.ts';

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
