import type {
  ColorHintsInterface,
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterface,
  TaskInterface,
  TaskManifestInterface,
} from '../../types/index.ts';
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
 * Adjusts a candidate color's OKLCH so it satisfies the role's
 * lightnessRange, chromaRange, and (if specified) absolute hueOffset
 * target. Already-conformant candidates are returned unchanged so the
 * common case is allocation-free, unless the role declares an `intent`
 * that the candidate's hints lack — in which case a new record is
 * allocated through the factory so `hints.intent` is propagated onto
 * the resolved record (the schema's intent is authoritative; see the
 * JSDoc on {@link RoleDefinitionInterface.intent}).
 */
function nudgeIntoRole(
  candidate: ColorRecordInterface,
  role: RoleDefinitionInterface,
): ColorRecordInterface {
  const { l, c, h } = candidate.oklch;

  const targetL = role.lightnessRange ? clampToRange(l, role.lightnessRange) : l;
  const targetC = role.chromaRange    ? clampToRange(c, role.chromaRange)    : c;
  const targetH = role.hueOffset !== undefined ? role.hueOffset             : h;

  const needsRangeNudge = targetL !== l || targetC !== c || targetH !== h;
  const needsIntent     = role.intent !== undefined && candidate.hints?.intent !== role.intent;

  if (!needsRangeNudge && !needsIntent) {
    return candidate;
  }

  const nextHints: ColorHintsInterface | undefined = role.intent !== undefined
    ? { ...candidate.hints, 'intent': role.intent }
    : candidate.hints;

  return colorRecordFactory.fromOklch(
    targetL,
    targetC,
    targetH,
    candidate.alpha,
    candidate.sourceFormat,
    nextHints,
  );
}

function synthesizeForRole(role: RoleDefinitionInterface): ColorRecordInterface {
  const l = role.lightnessRange ? rangeCenter(role.lightnessRange) : 0.5;
  const c = role.chromaRange    ? rangeCenter(role.chromaRange)    : 0;
  const h = role.hueOffset !== undefined ? role.hueOffset           : 0;
  const hints: ColorHintsInterface | undefined = role.intent !== undefined
    ? { 'intent': role.intent }
    : undefined;
  return colorRecordFactory.fromOklch(l, c, h, 1, 'oklch', hints);
}

/**
 * Pipeline task that assigns one `ColorRecord` to each non-derived
 * role in the schema. Resolution order:
 *   1. Hint match — a color carrying `hints.role === <name>` wins.
 *   2. No candidates available — `required` roles are synthesised
 *      from the role's own range centers.
 *   3. Closest by OKLCH distance to the range center.
 *
 * In all cases the assigned color is then nudged into the declared
 * `lightnessRange` / `chromaRange` (and exact `hueOffset` if set), so
 * required roles are guaranteed to satisfy their constraints. Roles
 * that had to be synthesised are recorded in
 * `state.metadata.rolesSynthesized` for diagnostics.
 *
 * Roles with `derivedFrom` are deferred to {@link ExpandFamily} and
 * skipped here.
 */
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

      // Hint match takes priority — explicit user intent.
      const hintMatch = state.colors.find((c) => c.hints?.['role'] === role.name);
      if (hintMatch) {
        state.roles[role.name] = nudgeIntoRole(hintMatch, role);
        ctx.logger.debug('ResolveRoles', 'run', 'Role assigned by hint match', { 'role': role.name });
        continue;
      }

      // No candidate colors at all — synthesize required roles from constraints.
      if (state.colors.length === 0) {
        if (role.required) {
          state.roles[role.name] = synthesizeForRole(role);
          synthesized.push(role.name);
          ctx.logger.debug('ResolveRoles', 'run', 'Role synthesized from constraints — no input colors', {
            'role': role.name,
          });
        }
        continue;
      }

      // Pick closest candidate by distance to constraint center.
      let best: ColorRecordInterface | undefined;
      let bestDist = Infinity;
      for (const color of state.colors) {
        const dist = distanceToRoleCenter(color, role);
        if (dist < bestDist) {
          bestDist = dist;
          best = color;
        }
      }

      // Nudge the candidate into the role's ranges so required roles are
      // guaranteed to satisfy lightnessRange, chromaRange, and hueOffset.
      if (best) {
        state.roles[role.name] = nudgeIntoRole(best, role);
        ctx.logger.debug('ResolveRoles', 'run', 'Role assigned by distance and nudged into range', {
          'role':     role.name,
          'distance': bestDist,
        });
      } else if (role.required) {
        // Defensive: state.colors was non-empty above, so this only fires
        // if every distance computation produced Infinity. Synthesise to
        // honour the required contract.
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

/** Singleton instance registered as the `resolve:roles` pipeline task. */
export const resolveRoles = new ResolveRoles();
