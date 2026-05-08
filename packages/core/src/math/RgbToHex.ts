import type { MathPrimitiveInterface } from '../model/types.ts';

export class RgbToHex implements MathPrimitiveInterface {
  readonly 'name' = 'rgbToHex';

  apply(...args: readonly unknown[]): string {
    const [r, g, b] = args;
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new Error('RgbToHex.apply: expected (r: number, g: number, b: number)');
    }
    const toHex = (v: number): string => {
      const byte = Math.round(Math.max(0, Math.min(1, v)) * 255);
      return byte.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

export const rgbToHex = new RgbToHex();
