import { lerp } from '@studnicky/iridis-algebra';
import type { HueDirectionType } from '@studnicky/iridis-algebra';

/**
 * The "dead zone": hues in this band read as dull brown/gray rather than a
 * recognizable color when a direct warm-to-cool hue sweep crosses it. Any
 * hue in [30, 90) degrees.
 */
const DEAD_ZONE_MIN = 30;
const DEAD_ZONE_MAX = 90;

/** Hue routed through when a detour is needed — a clear, saturated green. */
const DETOUR_HUE = 120;

/** Warm hues: reds through yellows, wrapping past 360 back to red. */
const isWarmHue = (h: number): boolean => h <= 60 || h >= 300;

/** Cool hues: cyans through blues and violets. */
const isCoolHue = (h: number): boolean => h >= 180 && h <= 300;

const inDeadZone = (h: number): boolean => h >= DEAD_ZONE_MIN && h < DEAD_ZONE_MAX;

const directHue = (from: number, to: number, t: number, direction: HueDirectionType): number => {
  const sample = lerp({ 'hue': { 'c': 0, 'h': from, 'l': 0 } }, { 'hue': { 'c': 0, 'h': to, 'l': 0 } }, t, { 'hueDirection': direction });
  return sample['hue']!.h;
};

const DEAD_ZONE_SAMPLE_COUNT = 9;

/**
 * True when the direct hue sweep from `from` to `to` passes through the
 * brown/gray dead zone. Detected by sampling several interior points along
 * the direct (non-detoured) path — a single midpoint sample would miss
 * dead-zone crossings that occur earlier or later in the sweep.
 */
const crossesDeadZone = (from: number, to: number, direction: HueDirectionType): boolean => {
  for (let i = 1; i < DEAD_ZONE_SAMPLE_COUNT; i += 1) {
    const sampleT = i / DEAD_ZONE_SAMPLE_COUNT;
    if (inDeadZone(directHue(from, to, sampleT, direction))) return true;
  }
  return false;
};

/**
 * Hue-path composer for warm-to-cool role transitions. When the direct hue
 * sweep would cross the dull brown/gray dead zone, the path is composed as
 * two segments through an intermediate green hue instead; otherwise it
 * falls through to the direct sweep unchanged.
 */
export const chromaticDetourHue = (
  from: number,
  to: number,
  t: number,
  direction: HueDirectionType = 'shortestArc'
): number => {
  const isWarmToCool = isWarmHue(from) && isCoolHue(to);
  if (!isWarmToCool || !crossesDeadZone(from, to, direction)) {
    return directHue(from, to, t, direction);
  }

  if (t <= 0.5) {
    return directHue(from, DETOUR_HUE, t / 0.5, direction);
  }
  return directHue(DETOUR_HUE, to, (t - 0.5) / 0.5, direction);
};
