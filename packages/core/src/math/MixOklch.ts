import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

const ACHROMATIC_CHROMA_EPSILON = 1e-4;

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) {diff -= 360;}
  if (diff < -180) {diff += 360;}
  return ((a + diff * t) % 360 + 360) % 360;
}

/** True when an OKLCH chroma is low enough that its paired hue is powerless (CSS Color 4 §12.2). */
function isAchromaticOklch(c: number): boolean {
  return c < ACHROMATIC_CHROMA_EPSILON;
}

/** Resolves the mixed hue, carrying the chromatic endpoint's hue past a powerless (achromatic) one. */
class Hue {
  static resolve(a: ColorRecordInterfaceType, b: ColorRecordInterfaceType, t: number): number {
    const aAchromatic = isAchromaticOklch(a.oklch.c);
    const bAchromatic = isAchromaticOklch(b.oklch.c);

    if (aAchromatic && bAchromatic) {
      return a.oklch.h;
    }
    if (aAchromatic) {
      return b.oklch.h;
    }
    if (bAchromatic) {
      return a.oklch.h;
    }
    return lerpAngle(a.oklch.h, b.oklch.h, t);
  }
}

class MixOklch {
  readonly 'name' = 'mixOklch';

  apply(a: ColorRecordInterfaceType, b: ColorRecordInterfaceType, t: number): ColorRecordInterfaceType {
    const tc = clamp01.apply(t);
    const l = a.oklch.l + (b.oklch.l - a.oklch.l) * tc;
    const c = a.oklch.c + (b.oklch.c - a.oklch.c) * tc;
    const h = Hue.resolve(a, b, tc);
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    return colorRecordFactory.fromOklch(l, c, h, { 'alpha': alpha });
  }
}

/** Singleton instance registered as the `mixOklch` math primitive. */
export const mixOklch = new MixOklch();
