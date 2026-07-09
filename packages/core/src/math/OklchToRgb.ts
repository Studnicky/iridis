import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class OklchToRgb {
  readonly 'name' = 'oklchToRgb';

  apply(l: number, c: number, h: number, alpha = 1): ColorRecordInterfaceType {
    const result = colorRecordFactory.fromOklch(l, c, h, { 'alpha': alpha });
    return result;
  }
}

/** Singleton instance registered as the `oklchToRgb` math primitive. */
export const oklchToRgb = new OklchToRgb();
