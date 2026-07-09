import type { HslResultInterfaceType } from '../types/index.ts';

import { clamp01 } from './Clamp01.ts';

class RgbToHsl {
  readonly 'name' = 'rgbToHsl';

  apply(r: number, g: number, b: number, alpha = 1): HslResultInterfaceType {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (delta > 0) {
      s = delta / (1 - Math.abs(2 * l - 1));

      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2);
      } else {
        h = 60 * ((r - g) / delta + 4);
      }

      if (h < 0) {
        h += 360;
      }
    }

    return {
      'alpha': clamp01.apply(alpha),
      'h':     h,
      'l':     l,
      's':     s
    };
  }
}

/** Singleton instance registered as the `rgbToHsl` math primitive. */
export const rgbToHsl = new RgbToHsl();
