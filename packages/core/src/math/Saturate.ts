import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

/**
 * Math primitive that increases OKLCH chroma by `deltaC`, leaving
 * lightness and hue alone. Chroma is clamped into [0, 0.5] (the iridis
 * working range — anything beyond is well outside sRGB anyway).
 */
export class Saturate implements MathPrimitiveInterface {
  readonly 'name' = 'saturate';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [color, deltaC] = args;
    if (!isColorRecord(color)) {
      throw new Error('Saturate.apply: expected (color: ColorRecord, deltaC: number)');
    }
    if (typeof deltaC !== 'number') {
      throw new Error('Saturate.apply: deltaC must be a number');
    }
    const c = Math.max(0, Math.min(0.5, color.oklch.c + deltaC));
    return colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, color.alpha);
  }
}

/** Singleton instance registered as the `saturate` math primitive. */
export const saturate = new Saturate();
