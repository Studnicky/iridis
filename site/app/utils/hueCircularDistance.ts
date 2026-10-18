import { normalizeHue } from './normalizeHue.ts';

/** Shortest angular distance between two hues in degrees, always in [0, 180]. */
class HueCircularDistanceOperation {
  static run(a: number, b: number): number {
    const diff = Math.abs(normalizeHue(a) - normalizeHue(b));
    const distance = Math.min(diff, 360 - diff);
    return distance;
  }
}

export const hueCircularDistance = HueCircularDistanceOperation.run;
