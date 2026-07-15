import type { HueDirectionType } from './types/index.ts';

const HUE_PERIOD = 360;

const normalizeHue = (h: number): number => {return ((h % HUE_PERIOD) + HUE_PERIOD) % HUE_PERIOD;};

/** Wraps a hue delta into (-180, 180], the shortest signed angular distance. */
export const wrapHueDelta = (delta: number): number => {
  const wrapped = normalizeHue(delta + 180) - 180;
  return wrapped === -180 ? 180 : wrapped;
};

/**
 * Interpolates hue around the 0/360 circle. `shortestArc` (default) picks
 * whichever of the clockwise (increasing hue) or counterClockwise
 * (decreasing hue) sweeps is angularly shorter; `clockwise`/`counterClockwise`
 * force that sweep direction regardless of distance.
 */
export const lerpHue = (a: number, b: number, t: number, direction: HueDirectionType = 'shortestArc'): number => {
  const forwardSweep  = normalizeHue(b - a);
  const backwardSweep = normalizeHue(a - b);

  let resolvedDirection: 'clockwise' | 'counterClockwise';
  if (direction === 'shortestArc') {
    resolvedDirection = forwardSweep <= backwardSweep ? 'clockwise' : 'counterClockwise';
  } else {
    resolvedDirection = direction;
  }

  const sweep = resolvedDirection === 'clockwise' ? forwardSweep : -backwardSweep;
  return normalizeHue(a + t * sweep);
};
