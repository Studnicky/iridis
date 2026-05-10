import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

export class HueShift implements MathPrimitiveInterface {
  readonly 'name' = 'hueShift';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [color, degrees] = args;
    if (!isColorRecord(color)) {
      throw new Error('HueShift.apply: expected (color: ColorRecord, degrees: number)');
    }
    if (typeof degrees !== 'number') {
      throw new Error('HueShift.apply: degrees must be a number');
    }
    const h = ((color.oklch.h + degrees) % 360 + 360) % 360;
    return colorRecordFactory.fromOklch(color.oklch.l, color.oklch.c, h, color.alpha);
  }
}

export const hueShift = new HueShift();
