import type { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

import type { EnforceOptionsInterface } from './interfaces/EnforceOptionsInterface.ts';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluate } from './Evaluate.ts';

/** Evaluates a two-stop curve at `t`, then re-validates the frame's contrast pairs. */
class EvaluateEnforced {
  static apply(
    from: PaletteInterfaceTypeEntity.Type,
    to: PaletteInterfaceTypeEntity.Type,
    t: number,
    options: EnforceOptionsInterface
  ): PaletteInterfaceTypeEntity.Type {
    const frame = evaluate(from, to, t, options);
    const result = enforceContrast(frame, options.contrastPairs, options.enforcer);
    return result;
  }
}

export const evaluateEnforced = EvaluateEnforced.apply;
