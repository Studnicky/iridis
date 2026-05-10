import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

const DEFAULT_L_RANGE: readonly [number, number] = [0.05, 0.95];
const DEFAULT_C_RANGE: readonly [number, number] = [0.0,  0.40];

function clampToRange(value: number, range: readonly [number, number]): number {
  return Math.max(range[0], Math.min(range[1], value));
}

function roleRangeFor(
  color: ColorRecordInterface,
  state: PaletteStateInterface,
): { 'lRange': readonly [number, number]; 'cRange': readonly [number, number] } {
  const roleName = color.hints?.['role'];

  if (roleName && state.input.roles) {
    const def = state.input.roles.roles.find((r) => r.name === roleName);
    if (def) {
      return {
        'lRange': def.lightnessRange ?? DEFAULT_L_RANGE,
        'cRange': def.chromaRange   ?? DEFAULT_C_RANGE,
      };
    }
  }

  return { 'lRange': DEFAULT_L_RANGE, 'cRange': DEFAULT_C_RANGE };
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
export class ClampOklch implements TaskInterface {
  readonly 'name' = 'clamp:oklch';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'clamp:oklch',
    'reads':       ['colors', 'input.roles'],
    'writes':      ['colors'],
    'description': 'Clamps each color OKLCH L and C into role-defined ranges (or sensible defaults). Preserves hue.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    for (let i = 0; i < state.colors.length; i++) {
      const color = state.colors[i];
      if (!color) continue;

      const { lRange, cRange } = roleRangeFor(color, state);
      const { l, c, h } = color.oklch;

      const clampedL = clampToRange(l, lRange);
      const clampedC = clampToRange(c, cRange);

      if (clampedL === l && clampedC === c) {
        continue;
      }

      const updated = colorRecordFactory.fromOklch(clampedL, clampedC, h, color.alpha);
      const withMeta: ColorRecordInterface = color.hints
        ? { ...updated, 'hints': color.hints, 'sourceFormat': color.sourceFormat }
        : { ...updated, 'sourceFormat': color.sourceFormat };

      state.colors[i] = withMeta;
      ctx.logger.debug(
        'ClampOklch',
        'run',
        `Clamped color ${i}: L ${l.toFixed(3)}→${clampedL.toFixed(3)}, C ${c.toFixed(3)}→${clampedC.toFixed(3)}`,
      );
    }
  }
}

/** Singleton instance registered as the `clamp:oklch` pipeline task. */
export const clampOklch = new ClampOklch();
