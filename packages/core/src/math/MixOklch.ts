import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) {diff -= 360;}
  if (diff < -180) {diff += 360;}
  return ((a + diff * t) % 360 + 360) % 360;
}

class MixOklch {
  readonly 'name' = 'mixOklch';

  apply(a: ColorRecordInterfaceType, b: ColorRecordInterfaceType, t: number): ColorRecordInterfaceType {
    const tc = clamp01.apply(t);
    const l = a.oklch.l + (b.oklch.l - a.oklch.l) * tc;
    const c = a.oklch.c + (b.oklch.c - a.oklch.c) * tc;
    const h = lerpAngle(a.oklch.h, b.oklch.h, tc);
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    return colorRecordFactory.fromOklch(l, c, h, { 'alpha': alpha });
  }
}

/** Singleton instance registered as the `mixOklch` math primitive. */
export const mixOklch = new MixOklch();
