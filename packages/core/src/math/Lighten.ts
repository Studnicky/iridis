import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

/**
 * Math primitive that increases OKLCH lightness by `deltaL`, leaving
 * chroma and hue alone. The result's lightness is clamped into [0, 1]
 * so absurd deltas produce pure white instead of throwing. Negative
 * deltas darken — symmetry with {@link Darken} is intentional.
 */
export class Lighten implements MathPrimitiveInterface {
  readonly 'name' = 'lighten';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [color, deltaL] = args;
    if (!isColorRecord(color)) {
      throw new Error('Lighten.apply: expected (color: ColorRecord, deltaL: number)');
    }
    if (typeof deltaL !== 'number') {
      throw new Error('Lighten.apply: deltaL must be a number');
    }
    const l = Math.max(0, Math.min(1, color.oklch.l + deltaL));
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `lighten` math primitive. */
export const lighten = new Lighten();
