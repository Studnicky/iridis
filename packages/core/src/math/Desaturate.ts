import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

export class Desaturate implements MathPrimitiveInterface {
  readonly 'name' = 'desaturate';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [color, deltaC] = args;
    if (!isColorRecord(color)) {
      throw new Error('Desaturate.apply: expected (color: ColorRecord, deltaC: number)');
    }
    if (typeof deltaC !== 'number') {
      throw new Error('Desaturate.apply: deltaC must be a number');
    }
    const c = Math.max(0, Math.min(0.5, color.oklch.c - deltaC));
    return colorRecordFactory.fromOklch(color.oklch.l, c, color.oklch.h, color.alpha);
  }
}

export const desaturate = new Desaturate();
