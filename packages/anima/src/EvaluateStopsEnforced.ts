import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { EnforceOptionsInterfaceType } from './types/index.ts';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluateStops } from './EvaluateStops.ts';

/** Evaluates a multi-stop curve at `t`, then re-validates the frame's contrast pairs. */
export const evaluateStopsEnforced = (
  stops: readonly PaletteInterfaceType[],
  t: number,
  opts: EnforceOptionsInterfaceType
): PaletteInterfaceType => {
  const frame = evaluateStops(stops, t, opts);
  return enforceContrast(frame, opts.contrastPairs, opts.level ?? 'aa');
};
