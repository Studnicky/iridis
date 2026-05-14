import type { ColorRecordInterface } from '../types/index.ts';
import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

export class MixSrgb {
  readonly 'name' = 'mixSrgb';

  apply(a: ColorRecordInterface, b: ColorRecordInterface, t: number): ColorRecordInterface {
    const tc = clamp01.apply(t);
    const r = a.rgb.r + (b.rgb.r - a.rgb.r) * tc;
    const g = a.rgb.g + (b.rgb.g - a.rgb.g) * tc;
    const bv = a.rgb.b + (b.rgb.b - a.rgb.b) * tc;
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    return colorRecordFactory.fromRgb(r, g, bv, alpha);
  }
}

/** Singleton instance registered as the `mixSrgb` math primitive. */
export const mixSrgb = new MixSrgb();
