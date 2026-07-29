import type {
  ColorRecordInterfaceType,
  ContrastPairInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { contrastApca, ensureContrast } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { ApcaPairResultInterfaceType } from '../types/augmentation.ts';

import { TextForegroundIntent } from '../data/TextForegroundIntent.ts';

// APCA Lc target selection per WCAG 3 Bronze level working draft (2023).
// Reference: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
// Lc 75: body / paragraph text (normal size, normal weight).
// Lc 60: fluent / headline / large text (≥18pt or ≥14pt bold).
// Lc 45: non-text UI components (icons, separators, input borders).
class ApcaTarget {
  static forPair(
    pair: ContrastPairInterfaceType,
    roles: Record<string, ColorRecordInterfaceType>
  ): number {
    const foregroundRecord = roles[pair.foreground];
    const backgroundRecord = roles[pair.background];
    if (foregroundRecord === undefined || backgroundRecord === undefined) {return 75;}
    const foregroundIntent = foregroundRecord.hints?.intent;
    const backgroundIntent = backgroundRecord.hints?.intent;
    if (foregroundIntent === 'text' && backgroundIntent === 'background') {return 75;}
    if (TextForegroundIntent.matches(foregroundIntent)) {return 60;}
    return 45;
  }
}

class EnforceApca implements TaskInterface {
  readonly 'name' = 'enforce:apca';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Enforce APCA (WCAG 3 draft) Lc targets: Lc 75 body text, Lc 60 fluent text, Lc 45 non-text UI.',
    'name':        'enforce:apca',
    'phase':       undefined,
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'requires':    undefined,
    'writes':      ['roles', 'metadata[\'contrast:apca\']']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    const extraPairs = state.input.contrast?.extra ?? [];
    const allPairs: readonly ContrastPairInterfaceType[] = [...pairs, ...extraPairs];

    const apcaPairs = allPairs.filter((pair) => {return (pair.algorithm ?? 'wcag21') === 'apca';});
    if (apcaPairs.length === 0) {
      return;
    }

    const results: ApcaPairResultInterfaceType[] = [];

    for (const pair of apcaPairs) {
      const foregroundRecord = state.roles[pair.foreground];
      const backgroundRecord = state.roles[pair.background];

      if (foregroundRecord === undefined || backgroundRecord === undefined) {
        context.logger.warn(
          LogBody.create()
            .component('EnforceApca')
            .operation('run')
            .status(LOG_STATUS.INVALID)
            .message('Role not found for pair')
            .context({ 'background': pair.background, 'foreground': pair.foreground })
            .build()
        );
        continue;
      }

      const requiredLc = ApcaTarget.forPair(pair, state.roles);
      const beforeLc = Math.abs(contrastApca.apply(foregroundRecord, backgroundRecord));

      let currentForeground = foregroundRecord;
      let current   = beforeLc;
      let iterations = 0;
      const maximumIterations = 25;

      while (current < requiredLc && iterations < maximumIterations) {
        iterations++;
        // APCA: adjust lightness of foreground toward the pole that increases contrast.
        // If foreground is lighter than background, lighten further; otherwise darken.
        currentForeground = ensureContrast.apply(currentForeground, backgroundRecord, requiredLc, 'apca');
        current = Math.abs(contrastApca.apply(currentForeground, backgroundRecord));
        // ensureContrast should converge in one call if implemented; iterate as safety net.
      }

      if (current < requiredLc) {
        context.logger.warn(
          LogBody.create()
            .component('EnforceApca')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('Pair could not reach required Lc after iterations')
            .context({
              'achievedLc':    current,
              'background':    pair.background,
              'foreground':    pair.foreground,
              'maxIterations': maximumIterations,
              'requiredLc':    requiredLc
            })
            .build()
        );
      }

      state.roles[pair.foreground] = currentForeground;

      results.push({
        'afterLc':    current,
        'algorithm':  'apca',
        'background': pair.background,
        'beforeLc':   beforeLc,
        'foreground': pair.foreground,
        'pass':       current >= requiredLc,
        'requiredLc': requiredLc
      });
    }

    const apcaMetadata = { 'pairs': results };
    state.metadata['contrast:apca'] = apcaMetadata;

    context.logger.debug(
      LogBody.create()
        .component('EnforceApca')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Processed APCA pairs')
        .context({ 'apcaMeta': apcaMetadata, 'pairCount': results.length })
        .build()
    );
  }
}

export const enforceApca = new EnforceApca();
