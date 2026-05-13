import type { ColorRecordInterface } from '../types/index.ts';
import { clamp01 } from './Clamp.ts';
import { hslToRgb } from './HslToRgb.ts';
import { rgbToHsl } from './RgbToHsl.ts';

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) % 360 + 360) % 360;
}

export class MixHsl {
  readonly 'name' = 'mixHsl';

  apply(a: ColorRecordInterface, b: ColorRecordInterface, t: number): ColorRecordInterface {
    const tc = clamp01(t);

    const hslA = rgbToHsl.apply(a.rgb.r, a.rgb.g, a.rgb.b);
    const hslB = rgbToHsl.apply(b.rgb.r, b.rgb.g, b.rgb.b);

    const h = lerpAngle(hslA.h, hslB.h, tc);
    const s = hslA.s + (hslB.s - hslA.s) * tc;
    const l = hslA.l + (hslB.l - hslA.l) * tc;
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;

    return hslToRgb.apply(h, s, l, alpha);
  }
}

/** Singleton instance registered as the `mixHsl` math primitive. */
export const mixHsl = new MixHsl();
