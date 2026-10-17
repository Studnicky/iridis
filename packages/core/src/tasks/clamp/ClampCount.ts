import { LogBodyConfigEntity } from '@studnicky/logger/entities';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '../../types/index.ts';

import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { clusterMedianCut } from '../../math/ClusterMedianCut.ts';

const DEFAULT_MAXIMUM_COLOR_COUNT = 64;

/**
 * Pipeline task that caps `state.colors.length` at `input.maximumColorCount`
 * (default 64) by running median-cut clustering when the limit is exceeded.
 * `Infinity` leaves the input color count unrestricted.
 *
 * Mutates `state.colors` in place rather than reassigning so other
 * tasks holding a reference (rare, but legal) see the new contents.
 */
class ClampCount implements TaskInterface {
  readonly 'name' = 'clamp:count';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Reduces state.colors to maximumColorCount (default 64) via median-cut clustering when the limit is exceeded; Infinity preserves every input color.',
    'name':        'clamp:count',
    'reads':       ['colors', 'input.maximumColorCount'],
    'requires':    ['clusterMedianCut'],
    'writes':      ['colors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    let maximumColorCount = DEFAULT_MAXIMUM_COLOR_COUNT;
    if (state.input.maximumColorCount !== undefined) {
      maximumColorCount = state.input.maximumColorCount;
    }

    if (maximumColorCount === Infinity) {
      return;
    }

    if (state.colors.length <= maximumColorCount) {
      return;
    }

    context.logger.info(
      LogBody.create(LogBodyConfigEntity.intake({
        'component': 'ClampCount',
        'context': {
          'from': state.colors.length,
          'to':   maximumColorCount
        },
        'message': 'Reducing colors via clusterMedianCut',
        'operation': 'run',
        'status': LOG_STATUS.PARTIAL
      }))
    );

    const clustered = clusterMedianCut.apply(state.colors, maximumColorCount);

    state.colors.length = 0;
    state.colors.push(...clustered);
  }
}

/** Singleton instance registered as the `clamp:count` pipeline task. */
export const clampCount = new ClampCount();
