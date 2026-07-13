/**
 * Pure helpers for ColorStreamCard.vue's naive-vs-engine comparison strips —
 * a static side-by-side demonstration of why perceptually-uniform OKLCH
 * interpolation reads as visually smoother than a plain RGB channel lerp.
 */

import { hexToRgb, oklchToRgb, rgbToHex } from '@studnicky/iridis/math';

/** One role's naive-RGB-lerp and OKLCH-lerp color bands, sampled at `count` evenly-spaced points across the same 0..1 progress axis. */
type ComparisonBandsType = {
  'engine': string[];
  'naive':  string[];
};

function oklchToHex(l: number, c: number, h: number): string {
  const rgb = oklchToRgb.apply(l, c, h).rgb;
  return rgbToHex.apply(rgb.r, rgb.g, rgb.b);
}

class ColorStreamComparison {
  /** Linearly interpolates each RGB channel independently between two hex colors — the "naive" CSS-style approach. */
  naiveRgbLerpHex(fromHex: string, toHex: string, t: number): string {
    const from = hexToRgb.apply(fromHex).rgb;
    const to = hexToRgb.apply(toHex).rgb;
    const r = from.r + (to.r - from.r) * t;
    const g = from.g + (to.g - from.g) * t;
    const b = from.b + (to.b - from.b) * t;
    return rgbToHex.apply(r, g, b);
  }

  /** Linearly interpolates l/c/h directly in OKLCH space — the engine's interpolation space (evaluated statically, without evaluate()'s easing). */
  oklchLerpHex(fromL: number, fromC: number, fromH: number, toL: number, toC: number, toH: number, t: number): string {
    const l = fromL + (toL - fromL) * t;
    const c = fromC + (toC - fromC) * t;
    const h = fromH + (toH - fromH) * t;
    return oklchToHex(l, c, h);
  }

  /** Builds both comparison bands between an OKLCH `from` and `to` endpoint, for direct side-by-side rendering. */
  buildComparisonBands(
    fromL: number, fromC: number, fromH: number,
    toL: number, toC: number, toH: number,
    count: number
  ): ComparisonBandsType {
    const fromHex = oklchToHex(fromL, fromC, fromH);
    const toHex = oklchToHex(toL, toC, toH);
    const naive: string[] = [];
    const engine: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0 : i / (count - 1);
      naive.push(this.naiveRgbLerpHex(fromHex, toHex, t));
      engine.push(this.oklchLerpHex(fromL, fromC, fromH, toL, toC, toH, t));
    }
    return { 'engine': engine, 'naive': naive };
  }
}

/** Singleton instance — stateless, safe to share across components. */
export const colorStreamComparison = new ColorStreamComparison();
