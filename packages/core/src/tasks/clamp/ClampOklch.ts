import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { OKLCH_RANGES } from './constants/OklchRanges.ts';

class OklchRangeGeometry {
  static clampToRange(value: number, range: readonly [number, number]): number {
    const result = Math.max(range[0], Math.min(range[1], value));
    return result;
  }

  static roleRangeFor(
    color: ColorRecordInterfaceType,
    state: PaletteStateInterface
  ): { 'cRange': readonly [number, number]; 'lRange': readonly [number, number]; } {
    const roleName = color.hints?.role;

    if (roleName !== undefined && state.input.roles !== undefined) {
      const definition = state.input.roles.roles.find((role) => {return role.name === roleName;});
      if (definition !== undefined) {
        return {
          'cRange': definition.chromaRange    ?? OKLCH_RANGES.DEFAULT_CHROMA_RANGE,
          'lRange': definition.lightnessRange ?? OKLCH_RANGES.DEFAULT_LIGHTNESS_RANGE
        };
      }
    }

    return { 'cRange': OKLCH_RANGES.DEFAULT_CHROMA_RANGE, 'lRange': OKLCH_RANGES.DEFAULT_LIGHTNESS_RANGE };
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

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Clamps each color OKLCH L and C into role-defined ranges (or sensible defaults). Preserves hue.',
    'name':        'clamp:oklch',
    'phase':       undefined,
    'reads':       ['colors', 'input.roles'],
    'requires':    undefined,
    'writes':      ['colors']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const colorCount = state.colors.length;
    for (let i = 0; i < colorCount; i++) {
      const color = state.colors[i];
      if (color === undefined) {continue;}

      const { cRange, lRange } = OklchRangeGeometry.roleRangeFor(color, state);
      const { c, h, l } = color.oklch;

      const clampedL = OklchRangeGeometry.clampToRange(l, lRange);
      const clampedC = OklchRangeGeometry.clampToRange(c, cRange);

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
        LogBody.create()
          .component('ClampOklch')
          .operation('run')
          .status(LOG_STATUS.SUCCESS)
          .message('Clamped color')
          .context({
            'cFrom':    c,
            'cTo':      clampedC,
            'index':    i,
            'lFrom':    l,
            'lTo':      clampedL
          })
          .build()
      );
    }
  }
}

/** Singleton instance registered as the `clamp:oklch` pipeline task. */
export const clampOklch = new ClampOklch();
