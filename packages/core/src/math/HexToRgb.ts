import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

/**
 * Math primitive that parses a hex color string and returns a fully
 * populated `ColorRecordInterface` (rgb + oklch + canonical hex).
 * Thin wrapper around {@link colorRecordFactory.fromHex} that satisfies
 * the variadic `MathPrimitiveInterface.apply` contract used by registries.
 */
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

/** Singleton instance registered as the `hexToRgb` math primitive. */
export const hexToRgb = new HexToRgb();
