import type { HueDirectionType } from './types/index.ts';

import { Hue } from './Hue.ts';

/**
 * Interpolates hue around the 0/360 circle. `shortestArc` (default) picks
 * whichever of the clockwise (increasing hue) or counterClockwise
 * (decreasing hue) sweeps is angularly shorter; `clockwise`/`counterClockwise`
 * force that sweep direction regardless of distance.
 */
export const lerpHue = (a: number, b: number, t: number, direction: HueDirectionType = 'shortestArc'): number => {
  const forwardSweep  = Hue.normalize(b - a);
  const backwardSweep = Hue.normalize(a - b);

  let resolvedDirection: 'clockwise' | 'counterClockwise';
  if (direction === 'shortestArc') {
    resolvedDirection = forwardSweep <= backwardSweep ? 'clockwise' : 'counterClockwise';
  } else {
    resolvedDirection = direction;
  }

  const sweep = resolvedDirection === 'clockwise' ? forwardSweep : -backwardSweep;
  return Hue.normalize(a + t * sweep);
};
