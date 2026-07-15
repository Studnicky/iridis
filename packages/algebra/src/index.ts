import type {
  LerpOptionsInterfaceType,
  PaletteDistanceMetricType,
  PaletteInterfaceType
} from './types/index.ts';

import { defaultPaletteDistance } from './DefaultPaletteDistance.ts';
import { lerpHue } from './LerpHue.ts';
import { wrapHueDelta } from './WrapHueDelta.ts';

export { lerpHue };

export type {
  HueDirectionType,
  LerpOptionsInterfaceType,
  OklchInterfaceType,
  PaletteDistanceMetricType,
  PaletteInterfaceType
} from './types/index.ts';

const DEFAULT_PERPENDICULAR_DELTA = 0.05;
const MAX_CHROMA = 0.5;

const requireRole = (palette: PaletteInterfaceType, role: string): PaletteInterfaceType[string] => {
  const record = palette[role];
  if (record === undefined) {throw new Error(`Palette is missing role "${role}"`);}
  return record;
};

/** Per-role OKLCH lerp between two palettes; hue wraps around the 0/360 circle. */
export const lerp = (
  a: PaletteInterfaceType,
  b: PaletteInterfaceType,
  t: number,
  opts?: LerpOptionsInterfaceType
): PaletteInterfaceType => {
  const hueDirection = opts?.hueDirection ?? 'shortestArc';
  const result: PaletteInterfaceType = {};
  for (const role of Object.keys(a)) {
    const roleA = requireRole(a, role);
    const roleB = requireRole(b, role);
    result[role] = {
      'c': roleA.c + t * (roleB.c - roleA.c),
      'h': lerpHue(roleA.h, roleB.h, t, hueDirection),
      'l': roleA.l + t * (roleB.l - roleA.l)
    };
  }
  return result;
};

/** Per-role OKLCH delta (a - b); hue delta is wrapped to [-180, 180]. */
export const subtract = (a: PaletteInterfaceType, b: PaletteInterfaceType): PaletteInterfaceType => {
  const result: PaletteInterfaceType = {};
  for (const role of Object.keys(a)) {
    const roleA = requireRole(a, role);
    const roleB = requireRole(b, role);
    result[role] = {
      'c': roleA.c - roleB.c,
      'h': wrapHueDelta(roleA.h - roleB.h),
      'l': roleA.l - roleB.l
    };
  }
  return result;
};

/** Returns whichever palette in `corpus` is closest to `target` under `metric` (default: {@link defaultPaletteDistance}). */
export const nearest = (
  target: PaletteInterfaceType,
  corpus: PaletteInterfaceType[],
  metric: PaletteDistanceMetricType = defaultPaletteDistance
): PaletteInterfaceType => {
  if (corpus.length === 0) {throw new Error('nearest() requires a non-empty corpus');}

  let closest = corpus[0]!;
  let closestDistance = metric(target, closest);
  for (let i = 1; i < corpus.length; i += 1) {
    const candidate = corpus[i]!;
    const distance = metric(target, candidate);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
};

/** True when the perceptual distance between `current` and `derived` exceeds `threshold` — signals a re-derivation is due. */
export const drift = (current: PaletteInterfaceType, derived: PaletteInterfaceType, threshold: number): boolean =>
{return defaultPaletteDistance(current, derived) > threshold;};

/**
 * Moves orthogonally on the chroma plane for `roleAxis`: l and h for that
 * role are held fixed while c is adjusted by `delta` (clamped to [0, 0.5]).
 * All other roles pass through unchanged.
 */
export const perpendicular = (
  a: PaletteInterfaceType,
  roleAxis: string,
  delta: number = DEFAULT_PERPENDICULAR_DELTA
): PaletteInterfaceType => {
  const target = requireRole(a, roleAxis);
  const result: PaletteInterfaceType = { ...a };
  result[roleAxis] = {
    'c': Math.min(MAX_CHROMA, Math.max(0, target.c + delta)),
    'h': target.h,
    'l': target.l
  };
  return result;
};
