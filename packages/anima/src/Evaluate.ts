import { OklchEntity, PaletteEntity } from '@studnicky/iridis-algebra';

import type { CurveOptionsInterface } from './interfaces/CurveOptionsInterface.ts';

import { chromaticDetourHue, hueInterpolations, linear } from './easings/index.ts';

/** Evaluates one admitted pair of palette stops at normalized progress. */
class Evaluate {
  static apply(
    from: PaletteEntity.Type,
    to: PaletteEntity.Type,
    progress: number,
    options?: CurveOptionsInterface
  ): PaletteEntity.Type {
    const easing = options?.easing ?? linear;
    const hueInterpolation = options?.hueInterpolation ?? hueInterpolations.shortestArc;
    const easedProgress = easing.apply(Math.min(1, Math.max(0, progress)));
    const detourRoleNames = new Set(options?.chromaticDetourRoles ?? []);
    const toRoles = new Map(Object.entries(to));
    const frame: PaletteEntity.Type = {};
    const fromEntries = Object.entries(from);

    for (let index = 0; index < fromEntries.length; index += 1) {
      const entry = fromEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [roleName, fromRole] = entry;
      const toRole = toRoles.get(roleName);
      if (toRole === undefined) {
        throw new Error(`evaluate() requires target role "${roleName}"`);
      }
      const directHue = hueInterpolation.apply(fromRole.h, toRole.h, easedProgress);
      const hue = detourRoleNames.has(roleName)
        ? chromaticDetourHue(fromRole.h, toRole.h, easedProgress, hueInterpolation)
        : directHue;
      Object.defineProperty(frame, roleName, {
        'configurable': true,
        'enumerable':   true,
        'value': OklchEntity.create({
          'c': fromRole.c + easedProgress * (toRole.c - fromRole.c),
          'h': hue,
          'l': fromRole.l + easedProgress * (toRole.l - fromRole.l)
        }),
        'writable': true
      });
    }
    const evaluatedFrame = PaletteEntity.create(frame);
    return evaluatedFrame;
  }
}

export const evaluate = Evaluate.apply;
