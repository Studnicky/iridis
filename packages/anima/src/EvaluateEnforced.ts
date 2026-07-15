import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import type { EnforceOptionsInterfaceType } from './types/index.ts';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluate } from './Evaluate.ts';

/** Evaluates a two-stop curve at `t`, then re-validates the frame's contrast pairs. */
export const evaluateEnforced = (
  from: PaletteInterfaceType,
  to: PaletteInterfaceType,
  t: number,
  opts: EnforceOptionsInterfaceType
): PaletteInterfaceType => {
  const frame = evaluate(from, to, t, opts);
  return enforceContrast(frame, opts.contrastPairs, opts.level ?? 'aa');
};
