import type { RgbInterface } from '../types/index.ts';
import { clamp01 } from './Clamp.ts';
import { srgbToLinear } from './SrgbToLinear.ts';

function srgbEncode(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export class DisplayP3ToSrgb {
  readonly 'name' = 'displayP3ToSrgb';

  apply(r: number, g: number, b: number): RgbInterface {
    const lin = srgbToLinear.apply(r, g, b);
    const rl = lin.r;
    const gl = lin.g;
    const bl = lin.b;

    const sr = srgbEncode(clamp01( 1.2249401 * rl - 0.2249404 * gl + 0.0000000 * bl));
    const sg = srgbEncode(clamp01(-0.0420569 * rl + 1.0420571 * gl - 0.0000001 * bl));
    const sb = srgbEncode(clamp01(-0.0196376 * rl - 0.0786361 * gl + 1.0982735 * bl));

    return { 'r': sr, 'g': sg, 'b': sb };
  }
}

/** Singleton instance registered as the `displayP3ToSrgb` math primitive. */
export const displayP3ToSrgb = new DisplayP3ToSrgb();
