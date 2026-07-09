import type { ColorRecordInterfaceType } from '../types/index.ts';

import { colorRecordFactory } from './ColorRecordFactory.ts';

class HexToRgb {
  readonly 'name' = 'hexToRgb';

  apply(hex: string): ColorRecordInterfaceType {
    const result = colorRecordFactory.fromHex(hex);
    return result;
  }
}

/** Singleton instance registered as the `hexToRgb` math primitive. */
export const hexToRgb = new HexToRgb();
