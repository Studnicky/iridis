import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

/**
 * Math primitive that rotates a color's OKLCH hue by `degrees` (positive
 * or negative). Lightness, chroma, and alpha are preserved; the result
 * is wrapped into [0, 360). Used by family-derivation tasks to cast
 * complementary, triadic, and analogous variants from a single seed.
 */
export class HueShift implements MathPrimitiveInterface {
  readonly 'name' = 'hueShift';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [color, degrees] = args;
    if (!isColorRecord(color)) {
      throw new Error('HueShift.apply: expected (color: ColorRecord, degrees: number)');
    }
    if (typeof degrees !== 'number') {
      throw new Error('HueShift.apply: degrees must be a number');
    }
    const h = ((color.oklch.h + degrees) % 360 + 360) % 360;
    return colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, h, color.alpha);
  }
}

/** Singleton instance registered as the `hueShift` math primitive. */
export const hueShift = new HueShift();
