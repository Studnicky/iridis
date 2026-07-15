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

const DEFAULT_L_RANGE: readonly [number, number] = [0.05, 0.95];
const DEFAULT_C_RANGE: readonly [number, number] = [0.0,  0.40];

function clampToRange(value: number, range: readonly [number, number]): number {
  const result = Math.max(range[0], Math.min(range[1], value));
  return result;
}

function roleRangeFor(
  color: ColorRecordInterfaceType,
  state: PaletteStateInterface
): { 'cRange': readonly [number, number]; 'lRange': readonly [number, number]; } {
  const roleName = color.hints?.role;

  if (roleName !== undefined && state.input.roles !== undefined) {
    const def = state.input.roles.roles.find((r) => {return r.name === roleName;});
    if (def !== undefined) {
      return {
        'cRange': def.chromaRange   ?? DEFAULT_C_RANGE,
        'lRange': def.lightnessRange ?? DEFAULT_L_RANGE
      };
    }
  }

  return { 'cRange': DEFAULT_C_RANGE, 'lRange': DEFAULT_L_RANGE };
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

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.colors.length; i++) {
      const color = state.colors[i];
      if (color === undefined) {continue;}

      const { cRange, lRange } = roleRangeFor(color, state);
      const { c, h, l } = color.oklch;

      const clampedL = clampToRange(l, lRange);
      const clampedC = clampToRange(c, cRange);

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
      ctx.logger.debug(
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
