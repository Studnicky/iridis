import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class HexToRgb {
  readonly 'name' = 'hexToRgb';

  apply(hex: string): ColorRecordInterface {
    return colorRecordFactory.fromHex(hex);
  }
}

export const hexToRgb = new HexToRgb();
