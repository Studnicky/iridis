import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class OklchToRgb {
  readonly 'name' = 'oklchToRgb';

  apply(l: number, c: number, h: number, alpha: number = 1): ColorRecordInterface {
    return colorRecordFactory.fromOklch(l, c, h, alpha);
  }
}

/** Singleton instance registered as the `oklchToRgb` math primitive. */
export const oklchToRgb = new OklchToRgb();
