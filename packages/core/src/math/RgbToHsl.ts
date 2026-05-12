import type { HslResultInterface } from '../model/types.ts';

export class RgbToHsl {
  readonly 'name' = 'rgbToHsl';

  apply(r: number, g: number, b: number, alpha: number = 1): HslResultInterface {
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
      'h':     h,
      's':     s,
      'l':     l,
      'alpha': Math.max(0, Math.min(1, alpha)),
    };
  }
}

/** Singleton instance registered as the `rgbToHsl` math primitive. */
export const rgbToHsl = new RgbToHsl();
