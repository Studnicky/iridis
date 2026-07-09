import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { contrastWcag21, ensureContrast } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { WcagPairResultInterfaceType } from '../types/augmentation.ts';

import { wcagRequiredRatio } from '../data/wcagRequiredRatio.ts';

class EnforceWcagAa implements TaskInterface {
  readonly 'name' = 'enforce:wcagAA';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Enforce WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs.',
    'name':        'enforce:wcagAA',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata[\'contrast:aa\']']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
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
            .component('EnforceWcagAa')
            .operation('run')
            .status(LOG_STATUS.INVALID)
            .message('Role not found for pair')
            .context({ 'background': pair.background, 'foreground': pair.foreground })
            .build()
        );
        continue;
      }

      const required = wcagRequiredRatio.apply('aa', pair, state.roles);
      const before = contrastWcag21.apply(fgRecord, bgRecord);

      const currentFg = ensureContrast.apply(fgRecord, bgRecord, required, 'wcag21');
      const current   = contrastWcag21.apply(currentFg, bgRecord);

      if (current < required) {
        ctx.logger.warn(
          LogBody.create()
            .component('EnforceWcagAa')
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

    state.metadata['contrast:aa'] = { 'pairs': results };

    ctx.logger.debug(
      LogBody.create()
        .component('EnforceWcagAa')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Processed pairs')
        .context({ 'aaMeta': state.metadata['contrast:aa'], 'pairCount': results.length })
        .build()
    );
  }
}

export const enforceWcagAa = new EnforceWcagAa();
