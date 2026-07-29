import type { HueDirectionType } from '@studnicky/iridis-algebra';

import { lerpHue } from '@studnicky/iridis-algebra';

import { CHROMATIC_DETOUR } from './constants/ChromaticDetour.ts';

/**
 * True when the direct hue sweep from `from` to `to` passes through the
 * brown/gray dead zone. Detected by sampling several interior points along
 * the direct (non-detoured) path — a single midpoint sample would miss
 * dead-zone crossings that occur earlier or later in the sweep.
 */
class ChromaticDetourHue {
  private static isWarm(hue: number): boolean {
    return hue <= 60 || hue >= 300;
  }

  private static isCool(hue: number): boolean {
    return hue >= 180 && hue <= 300;
  }

  private static isInDeadZone(hue: number): boolean {
    return hue >= CHROMATIC_DETOUR.deadZoneLowerBound && hue < CHROMATIC_DETOUR.deadZoneUpperBound;
  }

  private static crossesDeadZone(from: number, to: number, direction: HueDirectionType): boolean {
    for (let sampleIndex = 1; sampleIndex < CHROMATIC_DETOUR.deadZoneSampleCount; sampleIndex += 1) {
      const sampleT = sampleIndex / CHROMATIC_DETOUR.deadZoneSampleCount;
      if (ChromaticDetourHue.isInDeadZone(lerpHue(from, to, sampleT, direction))) {return true;}
    }
    return false;
  }

  /**
   * Hue-path composer for warm-to-cool role transitions. When the direct hue
   * sweep would cross the dull brown/gray dead zone, the path is composed as
   * two segments through an intermediate green hue instead; otherwise it
   * falls through to the direct sweep unchanged.
   */
  static apply(
    from: number,
    to: number,
    t: number,
    direction: HueDirectionType = 'shortestArc'
  ): number {
    const isWarmToCool = ChromaticDetourHue.isWarm(from) && ChromaticDetourHue.isCool(to);
    if (!isWarmToCool || !ChromaticDetourHue.crossesDeadZone(from, to, direction)) {
      return lerpHue(from, to, t, direction);
    }

    if (t <= 0.5) {
      return lerpHue(from, CHROMATIC_DETOUR.hue, t / 0.5, direction);
    }
    return lerpHue(CHROMATIC_DETOUR.hue, to, (t - 0.5) / 0.5, direction);
  }
}

export const chromaticDetourHue = ChromaticDetourHue.apply;
