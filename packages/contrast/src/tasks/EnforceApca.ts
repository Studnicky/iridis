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

// APCA Lc target selection per WCAG 3 Bronze level working draft (2023).
// Reference: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
// Lc 75: body / paragraph text (normal size, normal weight).
// Lc 60: fluent / headline / large text (≥18pt or ≥14pt bold).
// Lc 45: non-text UI components (icons, separators, input borders).
function apcaLcTarget(
  pair: ContrastPairInterfaceType,
  roles: Record<string, ColorRecordInterfaceType>
): number {
  const fgRecord = roles[pair.foreground];
  const bgRecord = roles[pair.background];
  if (fgRecord === undefined || bgRecord === undefined) {
    return 75;
  }
  const fgIntent = fgRecord.hints?.intent;
  const bgIntent = bgRecord.hints?.intent;
  const isText   = fgIntent === 'text' || bgIntent === 'text';
  const isBackground = fgIntent === 'background' || bgIntent === 'background';

  if (isText && isBackground) {
    // body text: Lc 75
    return 75;
  }
  if (isText) {
    // headline / fluent text on accent/muted: Lc 60
    return 60;
  }
  // non-text UI component: Lc 45
  return 45;
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

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    const extraPairs = state.input.contrast?.extra ?? [];
    const allPairs: readonly ContrastPairInterfaceType[] = [...pairs, ...extraPairs];

    const apcaPairs = allPairs.filter((p) => {return (p.algorithm ?? 'wcag21') === 'apca';});
    if (apcaPairs.length === 0) {
      return;
    }

    const results: ApcaPairResultInterfaceType[] = [];

    for (const pair of apcaPairs) {
      const fgRecord = state.roles[pair.foreground];
      const bgRecord = state.roles[pair.background];

      if (fgRecord === undefined || bgRecord === undefined) {
        ctx.logger.warn(
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

      const requiredLc = apcaLcTarget(pair, state.roles);
      const beforeLc = Math.abs(contrastApca.apply(fgRecord, bgRecord));

      let currentFg = fgRecord;
      let current   = beforeLc;
      let iterations = 0;
      const maxIterations = 25;

      while (current < requiredLc && iterations < maxIterations) {
        iterations++;
        // APCA: adjust lightness of foreground toward the pole that increases contrast.
        // If foreground is lighter than background, lighten further; otherwise darken.
        currentFg = ensureContrast.apply(currentFg, bgRecord, requiredLc, 'apca');
        current = Math.abs(contrastApca.apply(currentFg, bgRecord));
        // ensureContrast should converge in one call if implemented; iterate as safety net.
      }

      if (current < requiredLc) {
        ctx.logger.warn(
          LogBody.create()
            .component('EnforceApca')
            .operation('run')
            .status(LOG_STATUS.PARTIAL)
            .message('Pair could not reach required Lc after iterations')
            .context({
              'achievedLc':    current,
              'background':    pair.background,
              'foreground':    pair.foreground,
              'maxIterations': maxIterations,
              'requiredLc':    requiredLc
            })
            .build()
        );
      }

      state.roles[pair.foreground] = currentFg;

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

    state.metadata['contrast:apca'] = { 'pairs': results };

    ctx.logger.debug(
      LogBody.create()
        .component('EnforceApca')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Processed APCA pairs')
        .context({ 'apcaMeta': state.metadata['contrast:apca'], 'pairCount': results.length })
        .build()
    );
  }
}

export const enforceApca = new EnforceApca();
