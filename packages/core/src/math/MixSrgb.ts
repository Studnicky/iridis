import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['rgb'] === 'object' && c['rgb'] !== null;
}

export class MixSrgb implements MathPrimitiveInterface {
  readonly 'name' = 'mixSrgb';

  apply(...args: readonly unknown[]): ColorRecordInterface {
    const [a, b, t] = args;
    if (!isColorRecord(a) || !isColorRecord(b)) {
      throw new Error('MixSrgb.apply: expected (a: ColorRecord, b: ColorRecord, t: number)');
    }
    if (typeof t !== 'number') {
      throw new Error('MixSrgb.apply: t must be a number');
    }
    const tc = Math.max(0, Math.min(1, t));
    const r = a.rgb.r + (b.rgb.r - a.rgb.r) * tc;
    const g = a.rgb.g + (b.rgb.g - a.rgb.g) * tc;
    const bv = a.rgb.b + (b.rgb.b - a.rgb.b) * tc;
    const alpha = a.alpha + (b.alpha - a.alpha) * tc;
    return colorRecordFactory.fromRgb(r, g, bv, alpha);
  }
}

export const mixSrgb = new MixSrgb();
