import { lerp } from '@studnicky/iridis-algebra';
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { chromaticDetourHue, linear } from './easings/index.ts';
import type { CurveOptionsInterfaceType } from './types/index.ts';

const clampUnit = (t: number): number => Math.min(1, Math.max(0, t));

/**
 * Evaluates a two-stop palette curve at `t` (clamped to [0, 1]): the easing
 * function shapes `t` before iridis-algebra's `lerp` interpolates every
 * role's OKLCH triple between `from` and `to`. Roles named in
 * `opts.chromaticDetourRoles` have their hue re-composed through the green
 * detour path instead of the direct lerp when it would cross the brown/gray
 * dead zone.
 */
export const evaluate = (
  from: PaletteInterfaceType,
  to: PaletteInterfaceType,
  t: number,
  opts?: CurveOptionsInterfaceType
): PaletteInterfaceType => {
  const easing        = opts?.easing ?? linear;
  const hueDirection   = opts?.hueDirection ?? 'shortestArc';
  const easedT         = easing(clampUnit(t));
  const detourRoles    = opts?.chromaticDetourRoles ?? [];

  const frame = lerp(from, to, easedT, { 'hueDirection': hueDirection });

  for (const role of detourRoles) {
    const fromRole = from[role];
    const toRole   = to[role];
    const frameRole = frame[role];
    if (fromRole === undefined || toRole === undefined || frameRole === undefined) continue;
    frame[role] = {
      'c': frameRole.c,
      'h': chromaticDetourHue(fromRole.h, toRole.h, easedT, hueDirection),
      'l': frameRole.l
    };
  }

  return frame;
};
