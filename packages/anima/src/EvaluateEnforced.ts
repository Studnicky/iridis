import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { EnforceOptionsInterfaceType } from './types/index.ts';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluate } from './Evaluate.ts';

/** Evaluates a two-stop curve at `t`, then re-validates the frame's contrast pairs. */
class EvaluateEnforced {
  static apply(
    from: PaletteInterfaceType,
    to: PaletteInterfaceType,
    t: number,
    options: EnforceOptionsInterfaceType
  ): PaletteInterfaceType {
    const frame = evaluate(from, to, t, options);
    return enforceContrast(frame, options.contrastPairs, options.level ?? 'aa');
  }
}

export const evaluateEnforced = EvaluateEnforced.apply;
