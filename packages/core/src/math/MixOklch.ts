import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) % 360 + 360) % 360;
}

/**
 * Math primitive that linearly interpolates two colors in OKLCH space.
 * `t` is clamped into [0, 1]; hue takes the short angular path so a
 * mix from red to violet doesn't tour all of cyan/green. This is the
 * default mixer used by {@link ExpandFamily} and friends because OKLCH
 * preserves perceptual lightness through the mid-point, unlike sRGB.
 */
export class MixOklch implements MathPrimitiveInterface {
  readonly 'name' = 'mixOklch';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [a, b, t] = args;
    if (!isColorRecord(a) || !isColorRecord(b)) {
      throw new Error('MixOklch.apply: expected (a: ColorRecord, b: ColorRecord, t: number)');
    }
    if (typeof t !== 'number') {
      throw new Error('MixOklch.apply: t must be a number');
    }
    const tc = Math.max(0, Math.min(1, t));
    const l = a.oklch.l + (b.oklch.l - a.oklch.l) * tc;
    const c = a.oklch.c + (b.oklch.c - a.oklch.c) * tc;
    const h = lerpAngle(a.oklch.h, b.oklch.h, tc);
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    return colorRecordFactory.fromOklch(l, c, h, alpha);
  }
}

/** Singleton instance registered as the `mixOklch` math primitive. */
export const mixOklch = new MixOklch();
