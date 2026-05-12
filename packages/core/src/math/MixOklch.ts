import type { ColorRecordInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) % 360 + 360) % 360;
}

export class MixOklch {
  readonly 'name' = 'mixOklch';

  apply(a: ColorRecordInterface, b: ColorRecordInterface, t: number): ColorRecordInterface {
    const tc = Math.max(0, Math.min(1, t));
    const l = a.oklch.l + (b.oklch.l - a.oklch.l) * tc;
    const c = a.oklch.c + (b.oklch.c - a.oklch.c) * tc;
    const h = lerpAngle(a.oklch.h, b.oklch.h, tc);
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    return colorRecordFactory.fromOklch(l, c, h, alpha);
  }
}

export const mixOklch = new MixOklch();
