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

function clampToRange(value: number, range: readonly [number, number]): number {
  if (value < range[0]) return range[0];
  if (value > range[1]) return range[1];
  return value;
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

/**
 * Nudge a candidate color's OKLCH coordinates so they satisfy the role's
 * constraints. Lightness and chroma are clamped into their declared ranges;
 * hue is left alone unless hueOffset is declared as an absolute target,
 * in which case it is set exactly to that target.
 *
 * The returned ColorRecord is rebuilt via colorRecordFactory.fromOklch so
 * the rgb / hex are recomputed consistently with the nudged OKLCH.
 *
 * If the candidate already satisfies every constraint, the original record
 * is returned unchanged (no allocation).
 */
function nudgeIntoRole(
  candidate: ColorRecordInterface,
  role: RoleDefinitionInterface,
): ColorRecordInterface {
  const { l, c, h } = candidate.oklch;

  const targetL = role.lightnessRange ? clampToRange(l, role.lightnessRange) : l;
  const targetC = role.chromaRange    ? clampToRange(c, role.chromaRange)    : c;
  const targetH = role.hueOffset !== undefined ? role.hueOffset             : h;

  if (targetL === l && targetC === c && targetH === h) {
    return candidate;
  }

  return colorRecordFactory.fromOklch(targetL, targetC, targetH, candidate.alpha);
}

function synthesizeForRole(role: RoleDefinitionInterface): ColorRecordInterface {
  const l = role.lightnessRange ? rangeCenter(role.lightnessRange) : 0.5;
  const c = role.chromaRange    ? rangeCenter(role.chromaRange)    : 0;
  const h = role.hueOffset !== undefined ? role.hueOffset           : 0;
  return colorRecordFactory.fromOklch(l, c, h, 1);
}

export class ResolveRoles implements TaskInterface {
  readonly 'name' = 'resolve:roles';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'resolve:roles',
    'reads':       ['colors', 'input.roles'],
    'writes':      ['roles', 'metadata'],
    'description': 'Assigns colors to schema roles by hint match then OKLCH distance to range center, then nudges the assigned color into the role\'s declared ranges. Required roles are guaranteed populated and constraint-satisfying.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (!state.input.roles) {
      ctx.logger.debug('ResolveRoles', 'run', 'No role schema provided — skipping');
      return;
    }

    const schema = state.input.roles;
    const synthesized: string[] = [];

    for (const role of schema.roles) {
      if (role.derivedFrom) {
        continue;
      }

      // 1. Hint match takes priority — explicit user intent.
      const hintMatch = state.colors.find((c) => c.hints?.['role'] === role.name);
      if (hintMatch) {
        state.roles[role.name] = nudgeIntoRole(hintMatch, role);
        ctx.logger.debug('ResolveRoles', 'run', `Role "${role.name}" assigned by hint match`);
        continue;
      }

      // 2. No candidate colors at all — synthesize from constraints if required.
      if (state.colors.length === 0) {
        if (role.required) {
          state.roles[role.name] = synthesizeForRole(role);
          synthesized.push(role.name);
          ctx.logger.debug(
            'ResolveRoles',
            'run',
            `Role "${role.name}" synthesized from constraints (no input colors)`,
          );
        }
        continue;
      }

      // 3. Pick closest candidate by distance to constraint center.
      let best: ColorRecordInterface | undefined;
      let bestDist = Infinity;
      for (const color of state.colors) {
        const dist = distanceToRoleCenter(color, role);
        if (dist < bestDist) {
          bestDist = dist;
          best = color;
        }
      }

      // 4. Nudge the candidate into the role's ranges. Required means required:
      //    the assigned color is guaranteed to satisfy lightnessRange and
      //    chromaRange (and exact hueOffset if specified).
      if (best) {
        state.roles[role.name] = nudgeIntoRole(best, role);
        ctx.logger.debug(
          'ResolveRoles',
          'run',
          `Role "${role.name}" assigned by distance (dist=${bestDist.toFixed(4)}) and nudged into range`,
        );
      } else if (role.required) {
        // Defensive: shouldn't reach here since we checked state.colors above,
        // but if every distance computation produced Infinity, synthesize.
        state.roles[role.name] = synthesizeForRole(role);
        synthesized.push(role.name);
      }
    }

    if (synthesized.length > 0) {
      const existing = state.metadata['rolesSynthesized'];
      const prior: string[] = Array.isArray(existing) ? (existing as string[]) : [];
      state.metadata['rolesSynthesized'] = [...prior, ...synthesized];
    }
  }
}

export const resolveRoles = new ResolveRoles();
