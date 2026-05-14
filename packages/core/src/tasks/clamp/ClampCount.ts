import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
import { clusterMedianCut } from '../../math/ClusterMedianCut.ts';

const DEFAULT_MAX = 64;

/**
 * Pipeline task that caps `state.colors.length` at `input.maxColors`
 * (default 64) by running median-cut clustering when the limit is
 * exceeded. Skipped entirely when `input.bypass` is true — useful for
 * tests that need to assert against the raw intake set.
 *
 * Mutates `state.colors` in place rather than reassigning so other
 * tasks holding a reference (rare, but legal) see the new contents.
 */
export class ClampCount implements TaskInterface {
  readonly 'name' = 'clamp:count';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'clamp:count',
    'reads':       ['colors', 'input.maxColors', 'input.bypass'],
    'writes':      ['colors'],
    'requires':    ['clusterMedianCut'],
    'description': 'Reduces state.colors to maxColors (default 64) via median-cut clustering when the limit is exceeded and bypass is not set.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (state.input.bypass) {
      return;
    }

    const max = state.input.maxColors ?? DEFAULT_MAX;

    if (state.colors.length <= max) {
      return;
    }

    ctx.logger.info('ClampCount', 'run', 'Reducing colors via clusterMedianCut', {
      'from': state.colors.length,
      'to':   max,
    });

    const clustered = clusterMedianCut.apply(state.colors, max);

    state.colors.length = 0;
    for (const c of clustered) {
      state.colors.push(c);
    }
  }
}

/** Singleton instance registered as the `clamp:count` pipeline task. */
export const clampCount = new ClampCount();
