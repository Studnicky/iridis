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
    ctx: PipelineContextInterface
  ): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const results: WcagPairResultInterfaceType[] = [];

    for (const pair of pairs) {
      const algo = pair.algorithm ?? 'wcag21';
      if (algo !== 'wcag21') {
        continue;
      }

      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (fgRecord === undefined || bgRecord === undefined) {
        ctx.logger.warn(
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
      const before = contrastWcag21.apply(fgRecord, bgRecord);

      const currentFg = ensureContrast.apply(fgRecord, bgRecord, required, 'wcag21');
      const current   = contrastWcag21.apply(currentFg, bgRecord);

      if (current < required) {
        ctx.logger.warn(
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

      state.roles[pair.foreground] = currentFg;

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

    state.metadata[metadataKey] = { 'pairs': results };

    ctx.logger.debug(
      LogBody.create()
        .component(component)
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Processed pairs')
        .context({ 'meta': state.metadata[metadataKey], 'pairCount': results.length })
        .build()
    );
  }
}

export { WcagPairEnforcer };
