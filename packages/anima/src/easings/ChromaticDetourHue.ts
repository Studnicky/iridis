import type { HueInterpolationInterface } from '../interfaces/HueInterpolationInterface.ts';

import { CHROMATIC_DETOUR } from './constants/ChromaticDetour.ts';
import { hueInterpolations } from './HueInterpolations.ts';

/**
 * True when the direct hue sweep from `from` to `to` passes through the
 * brown/gray dead zone. Detected by sampling several interior points along
 * the direct (non-detoured) path — a single midpoint sample would miss
 * dead-zone crossings that occur earlier or later in the sweep.
 */
class ChromaticDetourHue {
  private static isWarm(hue: number): boolean {
    const result = hue <= 60 || hue >= 300;
    return result;
  }

  private static isCool(hue: number): boolean {
    const result = hue >= 180 && hue <= 300;
    return result;
  }

  private static isInDeadZone(hue: number): boolean {
    const result = hue >= CHROMATIC_DETOUR.deadZoneLowerBound && hue < CHROMATIC_DETOUR.deadZoneUpperBound;
    return result;
  }

  private static crossesDeadZone(from: number, to: number, interpolation: HueInterpolationInterface): boolean {
    for (let sampleIndex = 1; sampleIndex < CHROMATIC_DETOUR.deadZoneSampleCount; sampleIndex += 1) {
      const sampleProgress = sampleIndex / CHROMATIC_DETOUR.deadZoneSampleCount;
      const hue = interpolation.apply(from, to, sampleProgress);
      if (ChromaticDetourHue.isInDeadZone(hue)) {
        return true;
      }
    }
    return false;
  }

  /** Composes warm-to-cool transitions through green when their supplied hue path crosses the dead zone. */
  static apply(
    from: number,
    to: number,
    progress: number,
    interpolation: HueInterpolationInterface = hueInterpolations.shortestArc
  ): number {
    const isWarmToCool = ChromaticDetourHue.isWarm(from) && ChromaticDetourHue.isCool(to);
    if (!isWarmToCool || !ChromaticDetourHue.crossesDeadZone(from, to, interpolation)) {
      const result = interpolation.apply(from, to, progress);
      return result;
    }

    if (progress <= 0.5) {
      const result = interpolation.apply(from, CHROMATIC_DETOUR.hue, progress / 0.5);
      return result;
    }
    const result = interpolation.apply(CHROMATIC_DETOUR.hue, to, (progress - 0.5) / 0.5);
    return result;
  }
}

export const chromaticDetourHue = ChromaticDetourHue.apply;
