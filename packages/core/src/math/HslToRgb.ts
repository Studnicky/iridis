import type { ColorRecordInterface } from '../types/index.ts';
import { clamp01 } from './Clamp01.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function hslToRgbComponents(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return [r + m, g + m, b + m];
}

export class HslToRgb {
  readonly 'name' = 'hslToRgb';

  apply(h: number, s: number, l: number, alpha: number = 1): ColorRecordInterface {
    const [r, g, b] = hslToRgbComponents(((h % 360) + 360) % 360, clamp01.apply(s), clamp01.apply(l));
    return colorRecordFactory.fromRgb(r, g, b, alpha);
  }
}

/** Singleton instance registered as the `hslToRgb` math primitive. */
export const hslToRgb = new HslToRgb();
