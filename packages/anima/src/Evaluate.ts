import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { lerp } from '@studnicky/iridis-algebra';

import type { CurveOptionsInterfaceType } from './types/index.ts';

import { chromaticDetourHue, linear } from './easings/index.ts';

/**
 * Evaluates a two-stop palette curve at `t` (clamped to [0, 1]): the easing
 * function shapes `t` before iridis-algebra's `lerp` interpolates every
 * role's OKLCH triple between `from` and `to`. Roles named in
 * `opts.chromaticDetourRoles` have their hue re-composed through the green
 * detour path instead of the direct lerp when it would cross the brown/gray
 * dead zone.
 */
class Evaluate {
  static apply(
    from: PaletteInterfaceType,
    to: PaletteInterfaceType,
    t: number,
    options?: CurveOptionsInterfaceType
  ): PaletteInterfaceType {
    const easing        = options?.easing ?? linear;
    const hueDirection   = options?.hueDirection ?? 'shortestArc';
    const easedT         = easing(Math.min(1, Math.max(0, t)));
    const detourRoles    = options?.chromaticDetourRoles ?? [];

    const frame = lerp(from, to, easedT, { 'hueDirection': hueDirection });

    for (const role of detourRoles) {
      const fromRole = from[role];
      const toRole   = to[role];
      const frameRole = frame[role];
      if (fromRole === undefined || toRole === undefined || frameRole === undefined) {continue;}
      frame[role] = {
        'c': frameRole.c,
        'h': chromaticDetourHue(fromRole.h, toRole.h, easedT, hueDirection),
        'l': frameRole.l
      };
    }

    return frame;
  }
}

export const evaluate = Evaluate.apply;
