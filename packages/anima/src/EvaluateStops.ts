import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { CurveOptionsInterfaceType } from './types/index.ts';

import { evaluate } from './Evaluate.ts';

/**
 * Evaluates a multi-stop palette curve at `t` (clamped to [0, 1]): the range
 * is divided evenly across `stops.length - 1` segments, and `t` is mapped to
 * the segment it falls in before delegating to {@link evaluate} for that
 * segment's local progress.
 */
export const evaluateStops = (
  stops: readonly PaletteInterfaceType[],
  t: number,
  opts?: CurveOptionsInterfaceType
): PaletteInterfaceType => {
  if (stops.length === 0) {throw new Error('evaluateStops() requires at least one stop');}
  if (stops.length === 1) {return stops[0]!;}

  const segmentCount = stops.length - 1;
  const clamped      = Math.min(1, Math.max(0, t));
  const scaled       = clamped * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaled));
  const localT        = scaled - segmentIndex;

  const from = stops[segmentIndex]!;
  const to   = stops[segmentIndex + 1]!;
  return evaluate(from, to, localT, opts);
};
