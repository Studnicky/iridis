import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class OklchToRgb {
  readonly 'name' = 'oklchToRgb';

  apply(l: number, c: number, h: number, alpha: number = 1): ColorRecordInterface {
    return colorRecordFactory.fromOklch(l, c, h, alpha);
  }
}

export const oklchToRgb = new OklchToRgb();
