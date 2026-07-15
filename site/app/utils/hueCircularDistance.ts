import { normalizeHue } from './normalizeHue.ts';

/** Shortest angular distance between two hues in degrees, always in [0, 180]. */
export function hueCircularDistance(a: number, b: number): number {
  const diff = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(diff, 360 - diff);
}
