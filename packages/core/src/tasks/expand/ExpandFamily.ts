import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

function rangeCenter(range: readonly [number, number]): number {
  return (range[0] + range[1]) / 2;
}

function deriveColor(
  source: ColorRecordInterface,
  role: RoleDefinitionInterface,
): ColorRecordInterface {
  const { l, c, h } = source.oklch;

  const targetL = role.lightnessRange ? rangeCenter(role.lightnessRange) : l;
  const targetC = role.chromaRange    ? rangeCenter(role.chromaRange)    : c;
  const targetH = role.hueOffset !== undefined
    ? ((h + role.hueOffset) % 360 + 360) % 360
    : h;

  return colorRecordFactory.fromOklch(
    Math.max(0, Math.min(1,   targetL)),
    Math.max(0, Math.min(0.5, targetC)),
    targetH,
    source.alpha,
  );
}

export class ExpandFamily implements TaskInterface {
  readonly 'name' = 'expand:family';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'expand:family',
    'reads':       ['roles', 'input.roles'],
    'writes':      ['roles'],
    'description': 'Derives missing roles that have derivedFrom set. Applies OKLCH deltas from the source role. Never overwrites an already-assigned role.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (!state.input.roles) {
      ctx.logger.debug('ExpandFamily', 'run', 'No role schema — skipping');
      return;
    }

    for (const role of state.input.roles.roles) {
      if (!role.derivedFrom) {
        continue;
      }

      if (state.roles[role.name]) {
        ctx.logger.debug(
          'ExpandFamily',
          'run',
          `Role "${role.name}" already assigned — skipping`,
        );
        continue;
      }

      const sourceColor = state.roles[role.derivedFrom];

      if (!sourceColor) {
        ctx.logger.warn(
          'ExpandFamily',
          'run',
          `Role "${role.name}" derivedFrom "${role.derivedFrom}" but source is not assigned`,
        );
        continue;
      }

      state.roles[role.name] = deriveColor(sourceColor, role);
      ctx.logger.debug('ExpandFamily', 'run', `Derived role "${role.name}" from "${role.derivedFrom}"`);
    }
  }
}

export const expandFamily = new ExpandFamily();
