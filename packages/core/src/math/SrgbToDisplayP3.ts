import type { RgbInterface } from '../types/index.ts';
import { clamp01 } from './Clamp01.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

function p3Encode(v: number): number {
  if (v <= 0.0030186) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export class SrgbToDisplayP3 {
  readonly 'name' = 'srgbToDisplayP3';

  apply(r: number, g: number, b: number): RgbInterface {
    const lin = srgbToLinear.apply(r, g, b);
    const rl = lin.r;
    const gl = lin.g;
    const bl = lin.b;

    const p3r = p3Encode(clamp01.apply( 0.8224621 * rl + 0.1775380 * gl + 0.0000000 * bl));
    const p3g = p3Encode(clamp01.apply( 0.0331941 * rl + 0.9668058 * gl + 0.0000001 * bl));
    const p3b = p3Encode(clamp01.apply( 0.0170827 * rl + 0.0723968 * gl + 0.9105206 * bl));

    return { 'r': p3r, 'g': p3g, 'b': p3b };
  }
}

/** Singleton instance registered as the `srgbToDisplayP3` math primitive. */
export const srgbToDisplayP3 = new SrgbToDisplayP3();
