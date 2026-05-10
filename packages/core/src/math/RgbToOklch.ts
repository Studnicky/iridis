import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

/**
 * Math primitive that converts gamma-encoded sRGB components `(r, g, b,
 * alpha?)` in 0..1 into a fully-populated `ColorRecordInterface`. Pass
 * byte values pre-divided by 255.
 */
export class RgbToOklch implements MathPrimitiveInterface {
  readonly 'name' = 'rgbToOklch';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [r, g, b, alpha] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('RgbToOklch.apply: expected (r: number, g: number, b: number, alpha?: number)');
    }
    const a = alpha === undefined ? 1 : alpha;
    if (typeof a !== 'number') {
      throw new Error('RgbToOklch.apply: alpha must be a number');
    }
    return colorRecordFactory.fromRgb(r, g, b, a);
  }
}

/** Singleton instance registered as the `rgbToOklch` math primitive. */
export const rgbToOklch = new RgbToOklch();
