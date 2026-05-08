import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../model/types.ts';

function rangeCenter(range: readonly [number, number]): number {
  return (range[0] + range[1]) / 2;
}

function distanceToRoleCenter(color: ColorRecordInterface, role: RoleDefinitionInterface): number {
  const { l, c, h } = color.oklch;
  let distance = 0;

  if (role.lightnessRange) {
    const target = rangeCenter(role.lightnessRange);
    distance += Math.abs(l - target) * 2;
  }

  if (role.chromaRange) {
    const target = rangeCenter(role.chromaRange);
    distance += Math.abs(c - target);
  }

  if (role.hueOffset !== undefined) {
    const hueDiff = Math.abs(((h - role.hueOffset + 540) % 360) - 180);
    distance += (hueDiff / 360) * 0.5;
  }

  return distance;
}

export class ResolveRoles implements TaskInterface {
  readonly 'name' = 'resolve:roles';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'resolve:roles',
    'reads':       ['colors', 'input.roles'],
    'writes':      ['roles', 'metadata'],
    'description': 'Assigns colors to schema roles by hint match then OKLCH distance to range center. Required missing roles produce metadata warnings.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (!state.input.roles) {
      ctx.logger.debug('ResolveRoles', 'run', 'No role schema provided — skipping');
      return;
    }

    const schema = state.input.roles;
    const warnings: string[] = [];

    for (const role of schema.roles) {
      if (role.derivedFrom) {
        continue;
      }

      const hintMatch = state.colors.find(
        (c) => c.hints?.['role'] === role.name,
      );

      if (hintMatch) {
        state.roles[role.name] = hintMatch;
        ctx.logger.debug('ResolveRoles', 'run', `Role "${role.name}" assigned by hint match`);
        continue;
      }

      if (state.colors.length === 0) {
        if (role.required) {
          const msg = `Required role "${role.name}" has no candidate colors`;
          warnings.push(msg);
          ctx.logger.warn('ResolveRoles', 'run', msg);
        }
        continue;
      }

      let best: ColorRecordInterface | undefined;
      let bestDist = Infinity;

      for (const color of state.colors) {
        const dist = distanceToRoleCenter(color, role);
        if (dist < bestDist) {
          bestDist = dist;
          best = color;
        }
      }

      if (best) {
        state.roles[role.name] = best;
        ctx.logger.debug(
          'ResolveRoles',
          'run',
          `Role "${role.name}" assigned by distance (dist=${bestDist.toFixed(4)})`,
        );
      } else if (role.required) {
        const msg = `Required role "${role.name}" could not be assigned`;
        warnings.push(msg);
        ctx.logger.warn('ResolveRoles', 'run', msg);
      }
    }

    if (warnings.length > 0) {
      const existing = state.metadata['roleWarnings'];
      const prior: string[] = Array.isArray(existing) ? (existing as string[]) : [];
      state.metadata['roleWarnings'] = [...prior, ...warnings];
    }
  }
}

export const resolveRoles = new ResolveRoles();
