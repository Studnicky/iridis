import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class HexToRgb implements MathPrimitiveInterface {
  readonly 'name' = 'hexToRgb';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [hex] = args;
    if (typeof hex !== 'string') {
      throw new Error('HexToRgb.apply: expected (hex: string)');
    }
    return colorRecordFactory.fromHex(hex);
  }
}

export const hexToRgb = new HexToRgb();
