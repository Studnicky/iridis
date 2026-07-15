import type { ColorRecordInterfaceType } from '../types/index.ts';

import { clamp01 } from './Clamp01.ts';
import { hslToRgb } from './HslToRgb.ts';
import { rgbToHsl } from './RgbToHsl.ts';

const ACHROMATIC_SATURATION_EPSILON = 1e-4;

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) {diff -= 360;}
  if (diff < -180) {diff += 360;}
  return ((a + diff * t) % 360 + 360) % 360;
}

/** True when an HSL saturation is low enough that its paired hue is powerless (CSS Color 4 §12.2). */
function isAchromaticHsl(s: number): boolean {
  return s < ACHROMATIC_SATURATION_EPSILON;
}

/** Resolves the mixed hue, carrying the chromatic endpoint's hue past a powerless (achromatic) one. */
class Hue {
  static resolve(hslA: { 'h': number; 's': number }, hslB: { 'h': number; 's': number }, t: number): number {
    const aAchromatic = isAchromaticHsl(hslA.s);
    const bAchromatic = isAchromaticHsl(hslB.s);

    if (aAchromatic && bAchromatic) {
      return hslA.h;
    }
    if (aAchromatic) {
      return hslB.h;
    }
    if (bAchromatic) {
      return hslA.h;
    }
    return lerpAngle(hslA.h, hslB.h, t);
  }
}

class MixHsl {
  readonly 'name' = 'mixHsl';

  apply(a: ColorRecordInterfaceType, b: ColorRecordInterfaceType, t: number): ColorRecordInterfaceType {
    const tc = clamp01.apply(t);

    const hslA = rgbToHsl.apply(a.rgb.r, a.rgb.g, a.rgb.b);
    const hslB = rgbToHsl.apply(b.rgb.r, b.rgb.g, b.rgb.b);

    const h = Hue.resolve(hslA, hslB, tc);
    const s = hslA.s + (hslB.s - hslA.s) * tc;
    const l = hslA.l + (hslB.l - hslA.l) * tc;
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;

    return hslToRgb.apply(h, s, l, alpha);
  }
}

/** Singleton instance registered as the `mixHsl` math primitive. */
export const mixHsl = new MixHsl();
