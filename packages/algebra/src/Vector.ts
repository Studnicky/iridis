import type {
  LerpOptionsInterfaceType,
  PaletteDistanceMetricType,
  PaletteInterfaceType
} from './types/index.ts';

import { VECTOR_DEFAULTS } from './constants/VectorDefaults.ts';
import { DefaultPaletteDistance } from './DefaultPaletteDistance.ts';
import { LerpHue } from './LerpHue.ts';
import { WrapHueDelta } from './WrapHueDelta.ts';

/** Pure vector-math operations over palettes treated as points in OKLCH×N space. */
class Vector {
  private static requireRole(palette: PaletteInterfaceType, role: string): PaletteInterfaceType[string] {
    const record = palette[role];
    if (record === undefined) {throw new Error(`Palette is missing role "${role}"`);}
    return record;
  }

  /** Per-role OKLCH lerp between two palettes; hue wraps around the 0/360 circle. */
  static lerp(
    a: PaletteInterfaceType,
    b: PaletteInterfaceType,
    t: number,
    options?: LerpOptionsInterfaceType
  ): PaletteInterfaceType {
    const hueDirection = options?.hueDirection ?? 'shortestArc';
    const result: PaletteInterfaceType = {};
    for (const role of Object.keys(a)) {
      const roleA = Vector.requireRole(a, role);
      const roleB = Vector.requireRole(b, role);
      result[role] = {
        'c': roleA.c + t * (roleB.c - roleA.c),
        'h': LerpHue.of(roleA.h, roleB.h, t, hueDirection),
        'l': roleA.l + t * (roleB.l - roleA.l)
      };
    }
    return result;
  }

  /** Per-role OKLCH delta (a - b); hue delta is wrapped to [-180, 180]. */
  static subtract(a: PaletteInterfaceType, b: PaletteInterfaceType): PaletteInterfaceType {
    const result: PaletteInterfaceType = {};
    for (const role of Object.keys(a)) {
      const roleA = Vector.requireRole(a, role);
      const roleB = Vector.requireRole(b, role);
      result[role] = {
        'c': roleA.c - roleB.c,
        'h': WrapHueDelta.of(roleA.h - roleB.h),
        'l': roleA.l - roleB.l
      };
    }
    return result;
  }

  /** Returns whichever palette in `corpus` is closest to `target` under `metric` (default: {@link DefaultPaletteDistance.of}). */
  static nearest(
    target: PaletteInterfaceType,
    corpus: PaletteInterfaceType[],
    metric: PaletteDistanceMetricType = DefaultPaletteDistance.of
  ): PaletteInterfaceType {
    const corpusLength = corpus.length;
    if (corpusLength === 0) {throw new Error('nearest() requires a non-empty corpus');}

    let closest = corpus[0]!;
    let closestDistance = metric(target, closest);
    for (let i = 1; i < corpusLength; i += 1) {
      const candidate = corpus[i]!;
      const distance = metric(target, candidate);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
    return closest;
  }

  /** True when the perceptual distance between `current` and `derived` exceeds `threshold` — signals a re-derivation is due. */
  static drift(current: PaletteInterfaceType, derived: PaletteInterfaceType, threshold: number): boolean {
    return DefaultPaletteDistance.of(current, derived) > threshold;
  }

  /**
   * Moves orthogonally on the chroma plane for `roleAxis`: l and h for that
   * role are held fixed while c is adjusted by `delta` (clamped to [0, 0.5]).
   * All other roles pass through unchanged.
   */
  static perpendicular(
    a: PaletteInterfaceType,
    roleAxis: string,
    delta: number = VECTOR_DEFAULTS.DEFAULT_PERPENDICULAR_DELTA
  ): PaletteInterfaceType {
    const target = Vector.requireRole(a, roleAxis);
    const result: PaletteInterfaceType = { ...a };
    result[roleAxis] = {
      'c': Math.min(VECTOR_DEFAULTS.MAXIMUM_CHROMA, Math.max(0, target.c + delta)),
      'h': target.h,
      'l': target.l
    };
    return result;
  }
}

export { Vector };
