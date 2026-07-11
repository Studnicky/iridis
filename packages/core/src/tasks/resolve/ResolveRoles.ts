import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

/**
 * Rotate `src` toward `target` along the shortest arc, by at most `maxDeg`
 * degrees. A bounded nudge: keeps the resolved hue rooted in the palette while
 * leaning it toward a semantic target.
 */
function hueTowards(src: number, target: number, maxDeg: number): number {
  const delta = ((target - src + 540) % 360) - 180;
  const clamped = Math.max(-maxDeg, Math.min(maxDeg, delta));
  return (((src + clamped) % 360) + 360) % 360;
}

/**
 * Resolves the target hue for a candidate being nudged into a role:
 * an absolute/clamped `hue` target wins when set, otherwise `hueOffset`
 * is used as-is, otherwise the candidate's own hue is left unchanged.
 */
class TargetHue {
  static resolve(h: number, role: RoleDefinitionInterfaceType): number {
    if (role.hue !== undefined) {
      return role.hueClamp !== undefined
        ? hueTowards(h, role.hue, role.hueClamp)
        : (((role.hue % 360) + 360) % 360);
    }
    return role.hueOffset ?? h;
  }
}

function rangeCenter(range: readonly [number, number]): number {
  return (range[0] + range[1]) / 2;
}

function clampToRange(value: number, range: readonly [number, number]): number {
  if (value < range[0]) {return range[0];}
  if (value > range[1]) {return range[1];}
  return value;
}

function distanceToRoleCenter(color: ColorRecordInterfaceType, role: RoleDefinitionInterfaceType): number {
  const { c, h, l } = color.oklch;
  let distance = 0;

  if (role.lightnessRange !== undefined) {
    const target = rangeCenter(role.lightnessRange);
    distance += Math.abs(l - target) * 2;
  }

  if (role.chromaRange !== undefined) {
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
 * that the candidate's hints lack, in which case a new record is
 * allocated through the factory so `hints.intent` is propagated onto
 * the resolved record (the schema's intent is authoritative; see the
 * JSDoc on {@link RoleDefinitionInterfaceType.intent}).
 */
function nudgeIntoRole(
  candidate: ColorRecordInterfaceType,
  role: RoleDefinitionInterfaceType
): ColorRecordInterfaceType {
  const { c, h, l } = candidate.oklch;

  const targetL = role.lightnessRange !== undefined ? clampToRange(l, role.lightnessRange) : l;
  const targetC = role.chromaRange    !== undefined ? clampToRange(c, role.chromaRange)    : c;
  const targetH = TargetHue.resolve(h, role);

  const needsRangeNudge = targetL !== l || targetC !== c || targetH !== h;
  const needsIntent     = role.intent !== undefined && candidate.hints?.intent !== role.intent;

  if (!needsRangeNudge && !needsIntent) {
    return candidate;
  }

  const nextHints: ColorHintsInterfaceType | undefined = role.intent !== undefined
    ? { ...candidate.hints, 'intent': role.intent }
    : candidate.hints;

  return colorRecordFactory.fromOklch(
    targetL,
    targetC,
    targetH,
    { 'alpha': candidate.alpha, 'hints': nextHints, 'sourceFormat': candidate.sourceFormat }
  );
}

function synthesizedHue(role: RoleDefinitionInterfaceType): number {
  if (role.hue !== undefined) {
    return (((role.hue % 360) + 360) % 360);
  }
  return role.hueOffset ?? 0;
}

function synthesizeForRole(role: RoleDefinitionInterfaceType): ColorRecordInterfaceType {
  const l = role.lightnessRange !== undefined ? rangeCenter(role.lightnessRange) : 0.5;
  const c = role.chromaRange    !== undefined ? rangeCenter(role.chromaRange)    : 0;
  const h = synthesizedHue(role);
  const hints: ColorHintsInterfaceType | undefined = role.intent !== undefined
    ? { 'intent': role.intent }
    : undefined;
  return colorRecordFactory.fromOklch(l, c, h, { 'alpha': 1, 'hints': hints, 'sourceFormat': 'oklch' });
}

/**
 * Pipeline task that assigns one `ColorRecord` to each non-derived
 * role in the schema. Resolution order:
 *   1. Hint match: a color carrying `hints.role === <name>` wins.
 *   2. No candidates available: `required` roles are synthesised
 *      from the role's own range centers.
 *   3. Closest by OKLCH distance to the range center.
 *
 * In all cases the assigned color is then nudged into the declared
 * `lightnessRange` / `chromaRange` (and exact `hueOffset` if set), so
 * required roles are guaranteed to satisfy their constraints. Roles
 * that had to be synthesised are recorded in
 * `state.metadata['core:rolesSynthesized']` for diagnostics.
 *
 * Roles with `derivedFrom` are deferred to {@link ExpandFamily} and
 * skipped here.
 */
class ResolveRoles implements TaskInterface {
  readonly 'name' = 'resolve:roles';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Assigns colors to schema roles by hint match then OKLCH distance to range center, then nudges the assigned color into the role\'s declared ranges. Required roles are guaranteed populated and constraint-satisfying.',
    'name':        'resolve:roles',
    'reads':       ['colors', 'input.roles'],
    'writes':      ['roles', 'metadata']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    if (state.input.roles === undefined) {
      ctx.logger.debug(
        LogBody.create()
          .component('ResolveRoles')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('No role schema provided; skipping')
          .context({})
          .build()
      );
      return;
    }

    const schema = state.input.roles;
    const synthesized: string[] = [];

    for (const role of schema.roles) {
      if (role.derivedFrom !== undefined && role.derivedFrom.length > 0) {
        continue;
      }

      // Hint match takes priority: explicit user intent.
      const hintMatch = state.colors.find((c) => {return c.hints?.role === role.name;});
      if (hintMatch !== undefined) {
        const resolved = nudgeIntoRole(hintMatch, role);
        state.roles[role.name] = resolved;

        const isClamped = Math.abs(hintMatch.oklch.l - resolved.oklch.l) > 0.005 ||
                          Math.abs(hintMatch.oklch.c - resolved.oklch.c) > 0.005 ||
                          Math.abs(hintMatch.oklch.h - resolved.oklch.h) > 0.5;

        if (isClamped) {
          if (!state.metadata['core:roleClamps']) {
            state.metadata['core:roleClamps'] = {};
          }
          (state.metadata['core:roleClamps'] as Record<string, any>)[role.name] = {
            'seedHex': hintMatch.hex,
            'seedOklch': hintMatch.oklch,
            'resolvedHex': resolved.hex,
            'resolvedOklch': resolved.oklch
          };
        }

        const existingPinned = state.metadata['core:rolesPinned'];
        const priorPinned: string[] = Array.isArray(existingPinned) ? (existingPinned as string[]) : [];
        state.metadata['core:rolesPinned'] = [...priorPinned, role.name];

        ctx.logger.debug(
          LogBody.create()
            .component('ResolveRoles')
            .operation('run')
            .status(LOG_STATUS.SUCCESS)
            .message('Role assigned by hint match')
            .context({ 'role': role.name })
            .build()
        );
        continue;
      }

      // No candidate colors at all: synthesize required roles from constraints.
      if (state.colors.length === 0) {
        if (role.required === true) {
          state.roles[role.name] = synthesizeForRole(role);
          synthesized.push(role.name);
          ctx.logger.debug(
            LogBody.create()
              .component('ResolveRoles')
              .operation('run')
              .status(LOG_STATUS.PARTIAL)
              .message('Role synthesized from constraints; no input colors')
              .context({ 'role': role.name })
              .build()
          );
        }
        continue;
      }

      // Pick closest candidate by distance to constraint center.
      let best: ColorRecordInterfaceType | undefined;
      let bestDist = Infinity;
      const distances: Record<string, number> = {};

      for (const color of state.colors) {
        const dist = distanceToRoleCenter(color, role);
        distances[color.hex] = dist;
        if (dist < bestDist) {
          bestDist = dist;
          best = color;
        }
      }

      if (!state.metadata['core:roleDistances']) {
        state.metadata['core:roleDistances'] = {};
      }
      (state.metadata['core:roleDistances'] as Record<string, any>)[role.name] = distances;

      // Nudge the candidate into the role's ranges so required roles are
      // guaranteed to satisfy lightnessRange, chromaRange, and hueOffset.
      if (best !== undefined) {
        const resolved = nudgeIntoRole(best, role);
        state.roles[role.name] = resolved;
        
        const isClamped = Math.abs(best.oklch.l - resolved.oklch.l) > 0.005 ||
                          Math.abs(best.oklch.c - resolved.oklch.c) > 0.005 ||
                          Math.abs(best.oklch.h - resolved.oklch.h) > 0.5;

        if (isClamped) {
          if (!state.metadata['core:roleClamps']) {
            state.metadata['core:roleClamps'] = {};
          }
          (state.metadata['core:roleClamps'] as Record<string, any>)[role.name] = {
            'seedHex': best.hex,
            'seedOklch': best.oklch,
            'resolvedHex': resolved.hex,
            'resolvedOklch': resolved.oklch
          };
        }

        ctx.logger.debug(
          LogBody.create()
            .component('ResolveRoles')
            .operation('run')
            .status(LOG_STATUS.SUCCESS)
            .message('Role assigned by distance and nudged into range')
            .context({
              'distance': bestDist,
              'role':     role.name
            })
            .build()
        );
      } else if (role.required === true) {
        // Defensive: state.colors was non-empty above, so this only fires
        // if every distance computation produced Infinity. Synthesise to
        // honour the required contract.
        state.roles[role.name] = synthesizeForRole(role);
        synthesized.push(role.name);
      }
    }

    if (synthesized.length > 0) {
      const existing = state.metadata['core:rolesSynthesized'];
      const prior: string[] = Array.isArray(existing) ? (existing as string[]) : [];
      state.metadata['core:rolesSynthesized'] = [...prior, ...synthesized];
    }
  }
}

/** Singleton instance registered as the `resolve:roles` pipeline task. */
export const resolveRoles = new ResolveRoles();
