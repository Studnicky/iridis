import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['rgb'] === 'object' && c['rgb'] !== null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return [0, 0, l];
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r)      h = 60 * (((g - b) / delta) % 6);
  else if (max === g) h = 60 * ((b - r) / delta + 2);
  else                h = 60 * ((r - g) / delta + 4);
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [r + m, g + m, b + m];
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) % 360 + 360) % 360;
}

export class MixHsl implements MathPrimitiveInterface {
  readonly 'name' = 'mixHsl';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [a, b, t] = args;
    if (!isColorRecord(a) || !isColorRecord(b)) {
      throw new Error('MixHsl.apply: expected (a: ColorRecord, b: ColorRecord, t: number)');
    }
    if (typeof t !== 'number') {
      throw new Error('MixHsl.apply: t must be a number');
    }
    const tc = Math.max(0, Math.min(1, t));

    const [ha, sa, la] = rgbToHsl(a.rgb.r, a.rgb.g, a.rgb.b);
    const [hb, sb, lb] = rgbToHsl(b.rgb.r, b.rgb.g, b.rgb.b);

    const h = lerpAngle(ha, hb, tc);
    const s = sa + (sb - sa) * tc;
    const l = la + (lb - la) * tc;
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;

    const [r, g, bv] = hslToRgb(h, s, l);
    return colorRecordFactory.fromRgb(r, g, bv, alpha);
  }
}

export const mixHsl = new MixHsl();
