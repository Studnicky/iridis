import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

const ACHROMATIC_CHROMA_EPSILON = 1e-4;

/** Resolves the mixed hue, carrying the chromatic endpoint's hue past a powerless (achromatic) one. */
class Hue {
  static lerp(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) {diff -= 360;}
    if (diff < -180) {diff += 360;}
    const result = ((a + diff * t) % 360 + 360) % 360;
    return result;
  }

  /** True when an OKLCH chroma is low enough that its paired hue is powerless (CSS Color 4 §12.2). */
  static isAchromatic(c: number): boolean {
    const result = c < ACHROMATIC_CHROMA_EPSILON;
    return result;
  }

  static resolve(a: ColorRecordEntity.Type, b: ColorRecordEntity.Type, t: number): number {
    const aAchromatic = Hue.isAchromatic(a.oklch.c);
    const bAchromatic = Hue.isAchromatic(b.oklch.c);

    if (aAchromatic && bAchromatic) {
      return a.oklch.h;
    }
    if (aAchromatic) {
      return b.oklch.h;
    }
    if (bAchromatic) {
      return a.oklch.h;
    }
    const result = Hue.lerp(a.oklch.h, b.oklch.h, t);
    return result;
  }
}

class MixOklch {
  readonly 'name' = 'mixOklch';

  apply(a: ColorRecordEntity.Type, b: ColorRecordEntity.Type, t: number): ColorRecordEntity.Type {
    const tc = clamp01.apply(t);
    const l = a.oklch.l + (b.oklch.l - a.oklch.l) * tc;
    const c = a.oklch.c + (b.oklch.c - a.oklch.c) * tc;
    const h = Hue.resolve(a, b, tc);
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    const mixed = colorRecordFactory.fromOklch(l, c, h, { 'alpha': alpha });
    return mixed;
  }
}

/** Singleton instance registered as the `mixOklch` math primitive. */
export const mixOklch = new MixOklch();
