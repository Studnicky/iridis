import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
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

/**
 * Math primitive that converts HSL `(h: deg, s: 0..1, l: 0..1, alpha?)`
 * into a fully-populated `ColorRecordInterface`. Hue is wrapped into
 * [0, 360); saturation and lightness are clamped into the unit range.
 */
export class HslToRgb implements MathPrimitiveInterface {
  readonly 'name' = 'hslToRgb';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [h, s, l, alpha] = args;
    if (typeof h !== 'number' || typeof s !== 'number' || typeof l !== 'number') {
      throw new Error('HslToRgb.apply: expected (h: number, s: number, l: number, alpha?: number)');
    }
    const a = alpha === undefined ? 1 : alpha;
    if (typeof a !== 'number') {
      throw new Error('HslToRgb.apply: alpha must be a number');
    }
    const [r, g, b] = hslToRgbComponents(((h % 360) + 360) % 360, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)));
    return colorRecordFactory.fromRgb(r, g, b, a);
  }
}

/** Singleton instance registered as the `hslToRgb` math primitive. */
export const hslToRgb = new HslToRgb();
