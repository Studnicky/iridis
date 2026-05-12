import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class HexToRgb {
  readonly 'name' = 'hexToRgb';

  apply(hex: string): ColorRecordInterface {
    return colorRecordFactory.fromHex(hex);
  }
}

/** Singleton instance registered as the `hexToRgb` math primitive. */
export const hexToRgb = new HexToRgb();
