import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { EnforceOptionsInterfaceType } from './types/index.ts';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluateStops } from './EvaluateStops.ts';

/** Evaluates a multi-stop curve at `t`, then re-validates the frame's contrast pairs. */
class EvaluateStopsEnforced {
  static apply(
    stops: readonly PaletteInterfaceType[],
    t: number,
    options: EnforceOptionsInterfaceType
  ): PaletteInterfaceType {
    const frame = evaluateStops(stops, t, options);
    return enforceContrast(frame, options.contrastPairs, options.level ?? 'aa');
  }
}

export const evaluateStopsEnforced = EvaluateStopsEnforced.apply;
