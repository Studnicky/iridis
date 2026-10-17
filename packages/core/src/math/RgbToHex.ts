import { clamp01 } from './Clamp01.ts';

class RgbToHex {
  readonly 'name' = 'rgbToHex';

  apply(r: number, g: number, b: number): string {
    const toHex = (v: number): string => {
      const byte = Math.round(clamp01.apply(v) * 255);
      const hex = byte.toString(16).padStart(2, '0');
      return hex;
    };
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return hex;
  }
}

/** Singleton instance registered as the `rgbToHex` math primitive. */
export const rgbToHex = new RgbToHex();
