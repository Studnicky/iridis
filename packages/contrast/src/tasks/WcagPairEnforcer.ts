import type {
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';

import { contrastWcag21, ensureContrast } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { WcagPairResultInterfaceType } from '../types/augmentation.ts';

import { wcagRequiredRatio } from '../data/wcagRequiredRatio.ts';

/** Shared WCAG 2.1 AA/AAA pair-enforcement walk, parameterised by level. Used by both `EnforceWcagAa` and `EnforceWcagAaa` — the two tasks differ only in the level, metadata key, and component name for logging. */
class WcagPairEnforcer {
  static run(
    level: 'aa' | 'aaa',
    metadataKey: 'contrast:aa' | 'contrast:aaa',
    component: string,
    state: PaletteStateInterface,
    context: PipelineContextInterface
  ): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const results: WcagPairResultInterfaceType[] = [];

    for (const pair of pairs) {
      const algorithm = pair.algorithm ?? 'wcag21';
      if (algorithm !== 'wcag21') {
        continue;
      }

      const foregroundRecord = state.roles[pair.foreground];
      const backgroundRecord = state.roles[pair.background];

      if (foregroundRecord === undefined || backgroundRecord === undefined) {
        context.logger.warn(
          LogBody.create()
            .component(component)
            .operation('run')
            .status(LOG_STATUS.INVALID)
            .message('Role not found for pair')
            .context({ 'background': pair.background, 'foreground': pair.foreground })
            .build()
        );
        continue;
      }

      const required = wcagRequiredRatio.apply(level, pair, state.roles);
      const before = contrastWcag21.apply(foregroundRecord, backgroundRecord);

      const currentForeground = ensureContrast.apply(foregroundRecord, backgroundRecord, required, 'wcag21');
      const current   = contrastWcag21.apply(currentForeground, backgroundRecord);

      if (current < required) {
        context.logger.warn(
          LogBody.create()
            .component(component)
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('Pair could not reach required ratio')
            .context({
              'achieved':   current,
              'background': pair.background,
              'foreground': pair.foreground,
              'required':   required
            })
            .build()
        );
      }

      state.roles[pair.foreground] = currentForeground;

      results.push({
        'after':      current,
        'algorithm':  'wcag21',
        'background': pair.background,
        'before':     before,
        'foreground': pair.foreground,
        'pass':       current >= required,
        'required':   required
      });
    }

    const metadata = { 'pairs': results };
    state.metadata[metadataKey] = metadata;

    context.logger.debug(
      LogBody.create()
        .component(component)
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Processed pairs')
        .context({ 'meta': metadata, 'pairCount': results.length })
        .build()
    );
  }
}

export { WcagPairEnforcer };
