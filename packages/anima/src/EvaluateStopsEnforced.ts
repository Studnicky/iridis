import type { PaletteEntity } from '@studnicky/iridis-algebra';

import type { EnforceOptionsInterface } from './interfaces/EnforceOptionsInterface.ts';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluateStops } from './EvaluateStops.ts';

/** Evaluates a multi-stop curve at `t`, then re-validates the frame's contrast pairs. */
class EvaluateStopsEnforced {
  static apply(
    stops: readonly PaletteEntity.Type[],
    t: number,
    options: EnforceOptionsInterface
  ): PaletteEntity.Type {
    const frame = evaluateStops(stops, t, options);
    const result = enforceContrast(frame, options.contrastPairs, options.enforcer);
    return result;
  }
}

export const evaluateStopsEnforced = EvaluateStopsEnforced.apply;
