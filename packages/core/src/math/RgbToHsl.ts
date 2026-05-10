import type { MathPrimitiveInterface } from '../types/index.ts';

export interface HslResultInterface {
  readonly 'h': number;
  readonly 's': number;
  readonly 'l': number;
  readonly 'alpha': number;
}

export class RgbToHsl implements MathPrimitiveInterface {
  readonly 'name' = 'rgbToHsl';

  apply(...args: readonly unknown[]): HslResultInterface {
    const [r, g, b, alpha] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('RgbToHsl.apply: expected (r: number, g: number, b: number, alpha?: number)');
    }
    const a = alpha === undefined ? 1 : alpha;
    if (typeof a !== 'number') {
      throw new Error('RgbToHsl.apply: alpha must be a number');
    }

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
      'alpha': Math.max(0, Math.min(1, a)),
    };
  }
}

export const rgbToHsl = new RgbToHsl();
