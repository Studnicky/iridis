import type { PaletteInterfaceType } from './types/index.ts';

import { wrapHueDelta } from './WrapHueDelta.ts';

const HUE_NORMALIZATION_FACTOR = 180;

/**
 * Default perceptual distance between two palettes: sum over shared roles of
 * sqrt(Δl² + Δc² + Δh²), where Δh is the wrapped hue delta scaled by 1/180 so
 * a full half-circle hue swing (180°) contributes the same magnitude as a
 * full l or c swing (comparable to l ∈ [0,1] and c ∈ [0,0.5]).
 */
export const defaultPaletteDistance = (a: PaletteInterfaceType, b: PaletteInterfaceType): number => {
  let total = 0;
  for (const role of Object.keys(a)) {
    const roleA = a[role];
    const roleB = b[role];
    if (roleA === undefined || roleB === undefined) {continue;}

    const dl = roleA.l - roleB.l;
    const dc = roleA.c - roleB.c;
    const dh = wrapHueDelta(roleA.h - roleB.h) / HUE_NORMALIZATION_FACTOR;

    total += Math.sqrt(dl * dl + dc * dc + dh * dh);
  }
  return total;
};
