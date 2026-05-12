export class RgbToHex {
  readonly 'name' = 'rgbToHex';

  apply(r: number, g: number, b: number): string {
    const toHex = (v: number): string => {
      const byte = Math.round(Math.max(0, Math.min(1, v)) * 255);
      return byte.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

/** Singleton instance registered as the `rgbToHex` math primitive. */
export const rgbToHex = new RgbToHex();
