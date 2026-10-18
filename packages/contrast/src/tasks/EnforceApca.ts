import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';
import type { JSONSchema7Type } from 'json-schema';

import {
  contrastApca,
  ContrastPairInterfaceTypeEntity,
  ensureContrast,
  PaletteRoleState,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { TextForegroundIntent } from '../data/TextForegroundIntent.ts';
import { ApcaPairResultInterfaceTypeEntity } from '../entities/ApcaPairResultInterfaceTypeEntity.ts';
import { ApcaPairResultSetInterfaceTypeEntity } from '../entities/ApcaPairResultSetInterfaceTypeEntity.ts';

// APCA Lc target selection per WCAG 3 Bronze level working draft (2023).
// Reference: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
// Lc 75: body / paragraph text (normal size, normal weight).
// Lc 60: fluent / headline / large text (≥18pt or ≥14pt bold).
// Lc 45: non-text UI components (icons, separators, input borders).
class ApcaTarget {
  static forPair(
    pair: ContrastPairInterfaceTypeEntity.Type,
    roles: PaletteRoleState
  ): number {
    const foregroundRecord = roles.get(pair.foreground);
    const backgroundRecord = roles.get(pair.background);
    if (foregroundRecord === undefined || backgroundRecord === undefined) {return 75;}
    const foregroundIntent = foregroundRecord.hints?.intent;
    const backgroundIntent = backgroundRecord.hints?.intent;
    if (foregroundIntent === 'text' && backgroundIntent === 'background') {return 75;}
    if (TextForegroundIntent.matches(foregroundRecord.hints)) {return 60;}
    return 45;
  }
}

class ApcaPairSelection {
  static select(pairs: readonly JSONSchema7Type[]): ContrastPairInterfaceTypeEntity.Type[] {
    const selected: ContrastPairInterfaceTypeEntity.Type[] = [];
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair === undefined) {
        continue;
      }
      const admittedPair = ContrastPairInterfaceTypeEntity.intake(pair);
      if ((admittedPair.algorithm ?? 'wcag21') === 'apca') {
        selected.push(admittedPair);
      }
    }
    return selected;
  }
}

class EnforceApca implements TaskInterface {
  readonly 'name' = 'enforce:apca';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Enforce APCA (WCAG 3 draft) Lc targets: Lc 75 body text, Lc 60 fluent text, Lc 45 non-text UI.',
    'name':        'enforce:apca',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata[\'contrast:apca\']']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    const extraPairs = state.input.contrast?.extra ?? [];
    const allPairs = [...pairs, ...extraPairs];
    const apcaPairs = ApcaPairSelection.select(allPairs);
    if (apcaPairs.length === 0) {
      return;
    }

    const results: ApcaPairResultInterfaceTypeEntity.Type[] = [];

    const roles = PaletteRoleState.admit(state.roles);
    for (let index = 0; index < apcaPairs.length; index += 1) {
      const pair = apcaPairs[index];
      if (pair === undefined) {
        continue;
      }
      const foregroundRecord = roles.get(pair.foreground);
      const backgroundRecord = roles.get(pair.background);

      if (foregroundRecord === undefined || backgroundRecord === undefined) {
        context.logger.warn(
          LogBody.create({
            'component': 'EnforceApca',
            'context': { 'background': pair.background, 'foreground': pair.foreground },
            'message': 'Role not found for pair',
            'operation': 'run',
            'status': LOG_STATUS.INVALID
          })
        );
        continue;
      }

      const requiredLc = ApcaTarget.forPair(pair, roles);
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
          LogBody.create({
            'component': 'EnforceApca',
            'context': {
              'achievedLc':    current,
              'background':    pair.background,
              'foreground':    pair.foreground,
              'maxIterations': maximumIterations,
              'requiredLc':    requiredLc
            },
            'message': 'Pair could not reach required Lc after iterations',
            'operation': 'run',
            'status': LOG_STATUS.PARTIAL
          })
        );
      }

      roles.set(pair.foreground, currentForeground);

      results.push(ApcaPairResultInterfaceTypeEntity.create({
        'afterLc':    current,
        'algorithm':  'apca',
        'background': pair.background,
        'beforeLc':   beforeLc,
        'foreground': pair.foreground,
        'pass':       current >= requiredLc,
        'requiredLc': requiredLc
      }));
    }

    roles.commit();

    const apcaMetadata = ApcaPairResultSetInterfaceTypeEntity.create({ 'pairs': results });
    Object.defineProperty(state.metadata, 'contrast:apca', {
      'configurable': true,
      'enumerable':   true,
      'value':        apcaMetadata,
      'writable':     true
    });

    context.logger.debug(
      LogBody.create({
        'component': 'EnforceApca',
        'context': { 'apcaMeta': apcaMetadata, 'pairCount': results.length },
        'message': 'Processed APCA pairs',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const enforceApca = new EnforceApca();
