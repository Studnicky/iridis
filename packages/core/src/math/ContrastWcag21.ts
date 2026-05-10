import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['rgb'] === 'object' && c['rgb'] !== null;
}

function toLinear(v: number): number {
  if (v <= 0.04045) return v / 12.92;
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Math primitive that computes the WCAG 2.1 contrast ratio between two
 * colors as `(L_lighter + 0.05) / (L_darker + 0.05)`. Result is in the
 * 1..21 range. Symmetric: argument order doesn't matter. Used by the
 * `enforce:contrast` task when the configured algorithm is `wcag21`.
 */
export class ContrastWcag21 implements MathPrimitiveInterface {
  readonly 'name' = 'contrastWcag21';

  apply(...args: readonly unknown[]): number {
    const [a, b] = args;
    if (!isColorRecord(a) || !isColorRecord(b)) {
      throw new Error('ContrastWcag21.apply: expected (a: ColorRecord, b: ColorRecord)');
    }
    const l1 = relativeLuminance(a.rgb.r, a.rgb.g, a.rgb.b);
    const l2 = relativeLuminance(b.rgb.r, b.rgb.g, b.rgb.b);
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
}

/** Singleton instance registered as the `contrastWcag21` math primitive. */
export const contrastWcag21 = new ContrastWcag21();
