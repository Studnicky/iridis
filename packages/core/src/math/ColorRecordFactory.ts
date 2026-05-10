import type { ColorRecordInterface, OklchInterface, RgbInterface } from '../types/index.ts';

function oklchToRgbRaw(l: number, c: number, h: number): RgbInterface {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  let x = l + 0.3963377774 * a + 0.2158037573 * b;
  let y = l - 0.1055613458 * a - 0.0638541728 * b;
  let z = l - 0.0894841775 * a - 1.291485548  * b;

  x = x * x * x;
  y = y * y * y;
  z = z * z * z;

  let r = +4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
  let g = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
  let bv = -0.0041960863 * x - 0.7034186147 * y + 1.707614701  * z;

  r = gammaEncode(r);
  g = gammaEncode(g);
  bv = gammaEncode(bv);

  return {
    'r': Math.max(0, Math.min(1, r)),
    'g': Math.max(0, Math.min(1, g)),
    'b': Math.max(0, Math.min(1, bv)),
  };
}

function gammaEncode(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function gammaDecode(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToOklchRaw(r: number, g: number, b: number): OklchInterface {
  const rl = gammaDecode(r);
  const gl = gammaDecode(g);
  const bl = gammaDecode(b);

  let x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  let y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  let z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  x = Math.cbrt(x);
  y = Math.cbrt(y);
  z = Math.cbrt(z);

  const labL = 0.2104542553 * x + 0.7936177850 * y - 0.0040720468 * z;
  const labA = 1.9779984951 * x - 2.4285922050 * y + 0.4505937099 * z;
  const labB = 0.0259040371 * x + 0.7827717662 * y - 0.8086757660 * z;

  const c = Math.sqrt(labA * labA + labB * labB);
  let h = (Math.atan2(labB, labA) * 180) / Math.PI;
  if (h < 0) {
    h += 360;
  }

  return {
    'l': Math.max(0, Math.min(1, labL)),
    'c': Math.max(0, Math.min(0.5, c)),
    'h': h % 360,
  };
}

function rgbToHexStr(r: number, g: number, b: number): string {
  const toHex = (v: number): string => {
    const byte = Math.round(Math.max(0, Math.min(1, v)) * 255);
    return byte.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export class ColorRecordFactory {
  fromOklch(l: number, c: number, h: number, alpha: number = 1): ColorRecordInterface {
    const rgb = oklchToRgbRaw(l, c, h);
    return {
      'oklch':        { 'l': Math.max(0, Math.min(1, l)), 'c': Math.max(0, Math.min(0.5, c)), 'h': ((h % 360) + 360) % 360 },
      'rgb':          rgb,
      'hex':          rgbToHexStr(rgb.r, rgb.g, rgb.b),
      'alpha':        Math.max(0, Math.min(1, alpha)),
      'sourceFormat': 'oklch',
    };
  }

  fromRgb(r: number, g: number, b: number, alpha: number = 1): ColorRecordInterface {
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      'oklch':        oklch,
      'rgb':          { 'r': Math.max(0, Math.min(1, r)), 'g': Math.max(0, Math.min(1, g)), 'b': Math.max(0, Math.min(1, b)) },
      'hex':          rgbToHexStr(r, g, b),
      'alpha':        Math.max(0, Math.min(1, alpha)),
      'sourceFormat': 'rgb',
    };
  }

  fromHex(hex: string): ColorRecordInterface {
    const cleaned = hex.replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      throw new Error(`ColorRecordFactory.fromHex: invalid hex '${hex}'`);
    }
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;
    const oklch = rgbToOklchRaw(r, g, b);
    return {
      'oklch':        oklch,
      'rgb':          { 'r': r, 'g': g, 'b': b },
      'hex':          `#${cleaned.toLowerCase()}`,
      'alpha':        1,
      'sourceFormat': 'hex',
    };
  }
}

export const colorRecordFactory = new ColorRecordFactory();
