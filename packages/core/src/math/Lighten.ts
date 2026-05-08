import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

export class Lighten implements MathPrimitiveInterface {
  readonly 'name' = 'lighten';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [color, deltaL] = args;
    if (!isColorRecord(color)) {
      throw new Error('Lighten.apply: expected (color: ColorRecord, deltaL: number)');
    }
    if (typeof deltaL !== 'number') {
      throw new Error('Lighten.apply: deltaL must be a number');
    }
    const l = Math.max(0, Math.min(1, color.oklch.l + deltaL));
    return colorRecordFactory.fromOklch(l, color.oklch.c, color.oklch.h, color.alpha);
  }
}

export const lighten = new Lighten();
