import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '../../types/index.ts';

import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { RoleGeometry } from '../RoleGeometry.ts';
import { OKLCH_RANGES } from './constants/OklchRanges.ts';

class OklchRangeGeometry {
  static roleRangeFor(
    color: ColorRecordEntity.Type,
    state: PaletteStateInterface
  ): { 'cRange': readonly [number, number]; 'lRange': readonly [number, number]; } {
    const roleName = color.hints?.role;

    if (roleName !== undefined && state.input.roles !== undefined) {
      const definition = state.input.roles.roles.find((role): boolean => {
        const result = role.name === roleName;
        return result;
      });
      if (definition !== undefined) {
        return {
          'cRange': definition.chromaRange    ?? OKLCH_RANGES.DEFAULT_CHROMA_RANGE,
          'lRange': definition.lightnessRange ?? OKLCH_RANGES.DEFAULT_LIGHTNESS_RANGE
        };
      }
    }

    const result = { 'cRange': OKLCH_RANGES.DEFAULT_CHROMA_RANGE, 'lRange': OKLCH_RANGES.DEFAULT_LIGHTNESS_RANGE };
    return result;
  }
}

/**
 * Pipeline task that clamps each color's OKLCH lightness and chroma
 * into either the role-defined range (when the color carries a role
 * hint and the schema declares ranges) or the conservative defaults
 * `[0.05, 0.95]` for L and `[0, 0.40]` for C. Hue is always preserved.
 *
 * Runs before `resolve:roles` so the role-distance computation operates
 * on candidates that already live inside their target envelope. A color
 * that's already inside its range is returned untouched (no allocation).
 */
class ClampOklch implements TaskInterface {
  readonly 'name' = 'clamp:oklch';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Clamps each color OKLCH L and C into role-defined ranges (or sensible defaults). Preserves hue.',
    'name':        'clamp:oklch',
    'reads':       ['colors', 'input.roles'],
    'writes':      ['colors']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colorCount = state.colors.length;
    for (let i = 0; i < colorCount; i++) {
      const color = state.colors[i];
      if (color === undefined) {continue;}

      const { cRange, lRange } = OklchRangeGeometry.roleRangeFor(color, state);
      const { c, h, l } = color.oklch;

      const clampedL = RoleGeometry.clampRange(l, lRange);
      const clampedC = RoleGeometry.clampRange(c, cRange);

      if (clampedL === l && clampedC === c) {
        continue;
      }

      const updated = colorRecordFactory.fromOklch(
        clampedL,
        clampedC,
        h,
        { 'alpha': color.alpha, 'hints': color.hints, 'sourceFormat': color.sourceFormat }
      );

      state.colors[i] = updated;
      context.logger.debug(
        LogBody.create({
          'component': 'ClampOklch',
          'context': {
            'cFrom':    c,
            'cTo':      clampedC,
            'index':    i,
            'lFrom':    l,
            'lTo':      clampedL
          },
          'message': 'Clamped color',
          'operation': 'run',
          'status': LOG_STATUS.SUCCESS
        })
      );
    }
  }
}

/** Singleton instance registered as the `clamp:oklch` pipeline task. */
export const clampOklch = new ClampOklch();
