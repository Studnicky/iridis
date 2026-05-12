import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class RgbToOklch {
  readonly 'name' = 'rgbToOklch';

  apply(r: number, g: number, b: number, alpha: number = 1): ColorRecordInterface {
    return colorRecordFactory.fromRgb(r, g, b, alpha);
  }
}

/** Singleton instance registered as the `rgbToOklch` math primitive. */
export const rgbToOklch = new RgbToOklch();
