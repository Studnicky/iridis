import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { contrastWcag21, ensureContrast, getOrCreateMetadata } from '@studnicky/iridis';
import { wcagRequiredRatio } from '../data/wcagRequiredRatio.ts';
import type { WcagPairResultInterface } from '../types/augmentation.ts';

export class EnforceWcagAa implements TaskInterface {
  readonly 'name' = 'enforce:wcagAA';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'enforce:wcagAA',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata.wcag.aa'],
    'description': 'Enforce WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const results: WcagPairResultInterface[] = [];

    for (const pair of pairs) {
      const algo = pair.algorithm ?? 'wcag21';
      if (algo !== 'wcag21') {
        continue;
      }

      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (!fgRecord || !bgRecord) {
        ctx.logger.warn('EnforceWcagAa', 'run', 'Role not found for pair', {
          'foreground': pair.foreground,
          'background': pair.background,
        });
        continue;
      }

      const required = wcagRequiredRatio.apply('aa', pair, state.roles);
      const before = contrastWcag21.apply(fgRecord, bgRecord);

      const currentFg = ensureContrast.apply(fgRecord, bgRecord, required, 'wcag21');
      const current   = contrastWcag21.apply(currentFg, bgRecord);

      if (current < required) {
        ctx.logger.warn('EnforceWcagAa', 'run', 'Pair could not reach required ratio', {
          'foreground': pair.foreground,
          'background': pair.background,
          'required':   required,
          'achieved':   current,
        });
      }

      state.roles[pair.foreground] = currentFg;

      results.push({
        'foreground': pair.foreground,
        'background': pair.background,
        'algorithm':  'wcag21',
        'required':   required,
        'before':     before,
        'after':      current,
        'pass':       current >= required,
      });
    }

    const wcagMeta = getOrCreateMetadata(state, 'wcag');
    wcagMeta['aa'] = { 'pairs': results };

    ctx.logger.debug('EnforceWcagAa', 'run', 'Processed pairs', {
      'pairCount': results.length,
      'aaMeta':    wcagMeta['aa'],
    });
  }
}

export const enforceWcagAa = new EnforceWcagAa();
