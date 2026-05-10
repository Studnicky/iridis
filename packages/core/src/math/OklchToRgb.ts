import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

/**
 * Math primitive that converts OKLCH coordinates `(l, c, h, alpha?)`
 * into a fully-populated `ColorRecordInterface`. Delegates to
 * {@link colorRecordFactory.fromOklch}; out-of-gamut OKLCH values are
 * silently clipped to the sRGB cube rather than gamut-mapped.
 */
export class OklchToRgb implements MathPrimitiveInterface {
  readonly 'name' = 'oklchToRgb';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [l, c, h, alpha] = args;
    if (typeof l !== 'number' || typeof c !== 'number' || typeof h !== 'number') {
      throw new Error('OklchToRgb.apply: expected (l: number, c: number, h: number, alpha?: number)');
    }
    const a = alpha === undefined ? 1 : alpha;
    if (typeof a !== 'number') {
      throw new Error('OklchToRgb.apply: alpha must be a number');
    }
    return colorRecordFactory.fromOklch(l, c, h, a);
  }
}

/** Singleton instance registered as the `oklchToRgb` math primitive. */
export const oklchToRgb = new OklchToRgb();
