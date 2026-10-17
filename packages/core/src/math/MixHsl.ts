import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';

import { clamp01 } from './Clamp01.ts';
import { hslToRgb } from './HslToRgb.ts';
import { rgbToHsl } from './RgbToHsl.ts';

const ACHROMATIC_SATURATION_EPSILON = 1e-4;

/** Resolves the mixed hue, carrying the chromatic endpoint's hue past a powerless (achromatic) one. */
class Hue {
  static lerp(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) {diff -= 360;}
    if (diff < -180) {diff += 360;}
    const result = ((a + diff * t) % 360 + 360) % 360;
    return result;
  }

  /** True when an HSL saturation is low enough that its paired hue is powerless (CSS Color 4 §12.2). */
  static isAchromatic(s: number): boolean {
    const result = s < ACHROMATIC_SATURATION_EPSILON;
    return result;
  }

  static resolve(hslA: { 'h': number; 's': number }, hslB: { 'h': number; 's': number }, t: number): number {
    const aAchromatic = Hue.isAchromatic(hslA.s);
    const bAchromatic = Hue.isAchromatic(hslB.s);

    if (aAchromatic && bAchromatic) {
      return hslA.h;
    }
    if (aAchromatic) {
      return hslB.h;
    }
    if (bAchromatic) {
      return hslA.h;
    }
    const result = Hue.lerp(hslA.h, hslB.h, t);
    return result;
  }
}

class MixHsl {
  readonly 'name' = 'mixHsl';

  apply(a: ColorRecordInterfaceTypeEntity.Type, b: ColorRecordInterfaceTypeEntity.Type, t: number): ColorRecordInterfaceTypeEntity.Type {
    const tc = clamp01.apply(t);

    const hslA = rgbToHsl.apply(a.rgb.r, a.rgb.g, a.rgb.b);
    const hslB = rgbToHsl.apply(b.rgb.r, b.rgb.g, b.rgb.b);

    const h = Hue.resolve(hslA, hslB, tc);
    const s = hslA.s + (hslB.s - hslA.s) * tc;
    const l = hslA.l + (hslB.l - hslA.l) * tc;
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;

    const mixed = hslToRgb.apply(h, s, l, alpha);
    return mixed;
  }
}

/** Singleton instance registered as the `mixHsl` math primitive. */
export const mixHsl = new MixHsl();
