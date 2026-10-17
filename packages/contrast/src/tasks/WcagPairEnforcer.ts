import type {
  PaletteStateInterface,
  PipelineContextInterface
} from '@studnicky/iridis';

import { ContrastPairInterfaceTypeEntity, contrastWcag21, ensureContrast, PaletteRoleState } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { WcagPairResultInterfaceTypeEntity } from '../entities/WcagPairResultInterfaceTypeEntity.ts';

import { wcagRequiredRatio } from '../data/wcagRequiredRatio.ts';

/** Shared WCAG 2.1 AA/AAA pair-enforcement walk, parameterised by level. Used by both `EnforceWcagAa` and `EnforceWcagAaa` — the two tasks differ only in the level, metadata key, and component name for logging. */
class WcagPairEnforcer {
  static run(
    level: string,
    metadataKey: string,
    component: string,
    state: PaletteStateInterface,
    context: PipelineContextInterface
  ): void {
    const pairs = state.input.roles?.contrastPairs ?? [];
    if (pairs.length === 0) {
      return;
    }

    const results: WcagPairResultInterfaceTypeEntity.Type[] = [];
    const roles = PaletteRoleState.admit(state.roles);

    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = pairs[pairIndex];
      if (pair === undefined) {
        continue;
      }
      const admittedPair = ContrastPairInterfaceTypeEntity.intake(pair);
      const algorithm = admittedPair.algorithm ?? 'wcag21';
      if (algorithm !== 'wcag21') {
        continue;
      }

      const foregroundRecord = roles.get(pair.foreground);
      const backgroundRecord = roles.get(pair.background);

      if (foregroundRecord === undefined || backgroundRecord === undefined) {
        context.logger.warn(
          LogBody.create({ 'component': component, 'context': { 'background': pair.background, 'foreground': pair.foreground }, 'message': 'Role not found for pair', 'operation': 'run', 'status': LOG_STATUS.INVALID })
        );
        continue;
      }

      const required = level === 'aa'
        ? wcagRequiredRatio.forAa(admittedPair, state.roles)
        : wcagRequiredRatio.forAaa(admittedPair, state.roles);
      const before = contrastWcag21.apply(foregroundRecord, backgroundRecord);

      const currentForeground = ensureContrast.apply(foregroundRecord, backgroundRecord, required, 'wcag21');
      const current   = contrastWcag21.apply(currentForeground, backgroundRecord);

      if (current < required) {
        context.logger.warn(
          LogBody.create({ 'component': component, 'context': { 'achieved': current, 'background': pair.background, 'foreground': pair.foreground, 'required': required }, 'message': 'Pair could not reach required ratio', 'operation': 'run', 'status': LOG_STATUS.PARTIAL })
        );
      }

      roles.set(pair.foreground, currentForeground);

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

    roles.commit();

    const metadata = { 'pairs': results };
    Object.defineProperty(state.metadata, metadataKey, {
      'configurable': true,
      'enumerable':   true,
      'value':        metadata,
      'writable':     true
    });

    context.logger.debug(
      LogBody.create({ 'component': component, 'context': { 'meta': metadata, 'pairCount': results.length }, 'message': 'Processed pairs', 'operation': 'run', 'status': LOG_STATUS.SUCCESS })
    );
  }
}

export { WcagPairEnforcer };
