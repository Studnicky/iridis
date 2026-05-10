import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const c = v as Record<string, unknown>;

  return typeof c['rgb'] === 'object' && c['rgb'] !== null;
}

function toLinear(value: number): number {
  if (value <= 0.04045) {
    return value / 12.92;
  }

  return Math.pow((value + 0.055) / 1.055, 2.4);
}

export class Luminance implements MathPrimitiveInterface {
  readonly 'name' = 'luminance';

  apply(...args: readonly unknown[]): number {
    const [color] = args;

    if (!isColorRecord(color)) {
      throw new Error('Luminance.apply: expected (color: ColorRecordInterface)');
    }
    const { 'r': r, 'g': g, 'b': b } = color.rgb;

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
}

export const luminance = new Luminance();
