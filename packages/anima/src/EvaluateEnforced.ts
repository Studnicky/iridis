import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { enforceContrast } from './EnforceContrast.ts';
import { evaluate } from './Evaluate.ts';
import { evaluateStops } from './EvaluateStops.ts';
import type { EnforceOptionsInterfaceType } from './types/index.ts';

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

/** Evaluates a multi-stop curve at `t`, then re-validates the frame's contrast pairs. */
export const evaluateStopsEnforced = (
  stops: readonly PaletteInterfaceType[],
  t: number,
  opts: EnforceOptionsInterfaceType
): PaletteInterfaceType => {
  const frame = evaluateStops(stops, t, opts);
  return enforceContrast(frame, opts.contrastPairs, opts.level ?? 'aa');
};
