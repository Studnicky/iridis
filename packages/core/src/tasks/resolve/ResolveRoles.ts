import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type {
  ColorHintsInterfaceType,
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleDefinitionInterfaceType,
  RoleProvenanceInterfaceType,
  TaskInterface,
  TaskManifestInterfaceType
} from '../../types/index.ts';

import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { EngineMetadata } from '../../types/metadata.ts';
import { RoleGeometry } from '../RoleGeometry.ts';

/**
 * Resolves the target hue for a candidate being nudged into a role:
 * an absolute/clamped `hue` target wins when set, otherwise `hueOffset`
 * is applied as a signed relative delta, otherwise the candidate's own hue is left unchanged.
 */
class TargetHue {
  static resolve(h: number, role: RoleDefinitionInterfaceType): number {
    if (role.hue !== undefined) {
      return RoleGeometry.hueTowards(h, role.hue, role.hueClamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
    }
    return role.hueOffset === undefined ? h : ((h + role.hueOffset) % 360 + 360) % 360;
  }
}

class RoleNudge {
  static clampToRange(value: number, range: readonly [number, number]): number {
    if (value < range[0]) {return range[0];}
    if (value > range[1]) {return range[1];}
    return value;
  }

  static distanceToRoleCenter(color: ColorRecordInterfaceType, role: RoleDefinitionInterfaceType): number {
    const { c, l } = color.oklch;
    let distance = 0;

    if (role.lightnessRange !== undefined) {
      const target = RoleGeometry.rangeCenter(role.lightnessRange);
      distance += Math.abs(l - target) * 2;
    }

    if (role.chromaRange !== undefined) {
      const target = RoleGeometry.rangeCenter(role.chromaRange);
      distance += Math.abs(c - target);
    }

    return distance;
  }

  static intoRole(
    candidate: ColorRecordInterfaceType,
    role: RoleDefinitionInterfaceType
  ) {
    const { c, h, l } = candidate.oklch;
    const targetL = role.lightnessRange !== undefined ? RoleNudge.clampToRange(l, role.lightnessRange) : l;
    const targetC = role.chromaRange !== undefined ? RoleNudge.clampToRange(c, role.chromaRange) : c;
    const targetH = TargetHue.resolve(h, role);
    const nextHints: ColorHintsInterfaceType | undefined = role.intent !== undefined
      ? { 'intent': role.intent, 'role': candidate.hints?.role, 'weight': candidate.hints?.weight }
      : candidate.hints;
    const adjustments: RoleProvenanceInterfaceType['adjustments'] = [];
    let record = candidate;

    if (targetH !== h) {
      record = colorRecordFactory.fromOklch(l, c, targetH, {
        'alpha': candidate.alpha,
        'hints': nextHints,
        'sourceFormat': candidate.sourceFormat
      });
      if (record.hex !== candidate.hex) {
        adjustments.push({ 'afterHex': record.hex, 'beforeHex': candidate.hex, 'operation': 'hue-target' });
      }
    }

    if (targetL !== l || targetC !== c) {
      const beforeRange = record;
      record = colorRecordFactory.fromOklch(targetL, targetC, targetH, {
        'alpha': candidate.alpha,
        'hints': nextHints,
        'sourceFormat': candidate.sourceFormat
      });
      if (record.hex !== beforeRange.hex) {
        adjustments.push({ 'afterHex': record.hex, 'beforeHex': beforeRange.hex, 'operation': 'role-range' });
      }
    }

    if (record === candidate && nextHints !== candidate.hints) {
      record = { ...candidate, 'hints': nextHints };
    }

    return { 'adjustments': adjustments, 'record': record };
  }
}
class RoleSynthesis {
  static hueFor(role: RoleDefinitionInterfaceType): number {
    if (role.hue !== undefined) {
      return (((role.hue % 360) + 360) % 360);
    }
    return role.hueOffset ?? 0;
  }

  static forRole(role: RoleDefinitionInterfaceType): ColorRecordInterfaceType {
    const l = role.lightnessRange !== undefined ? RoleGeometry.rangeCenter(role.lightnessRange) : 0.5;
    const c = role.chromaRange    !== undefined ? RoleGeometry.rangeCenter(role.chromaRange)    : 0;
    const h = RoleSynthesis.hueFor(role);
    const hints: ColorHintsInterfaceType | undefined = role.intent !== undefined
      ? { 'intent': role.intent, 'role': undefined, 'weight': undefined }
      : undefined;
    return colorRecordFactory.fromOklch(l, c, h, { 'alpha': 1, 'hints': hints, 'sourceFormat': 'oklch' });
  }
}

/**
 * Pipeline task that assigns one ColorRecord to each non-derived schema role.
 * Explicit role hints are caller-stated records and remain unchanged. Unhinted
 * candidates are resolver-derived and record every colour adjustment.
 */
class ResolveRoles implements TaskInterface {
  readonly 'name' = 'resolve:roles';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Assigns caller-stated colors by role hint, otherwise resolves the closest candidate into schema constraints and records canonical role provenance.',
    'name':        'resolve:roles',
    'phase':       undefined,
    'reads':       ['colors', 'input.roles', 'metadata'],
    'requires':    undefined,
    'writes':      ['roles', 'metadata']
  };

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    if (state.input.roles === undefined) {
      context.logger.debug(
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
    const hueTargetOverrides = EngineMetadata.get(state.metadata, 'core:hueTargetOverrides');
    const roleProvenance = EngineMetadata.get(state.metadata, 'core:roleProvenance') ?? {};
    state.metadata['core:roleProvenance'] = roleProvenance;

    const colorsByRoleHint = new Map<string, ColorRecordInterfaceType>();
    for (const color of state.colors) {
      const hintedRole = color.hints?.role;
      if (hintedRole !== undefined && !colorsByRoleHint.has(hintedRole)) {
        colorsByRoleHint.set(hintedRole, color);
      }
    }

    for (const inputRole of schema.roles) {
      const hintMatch = colorsByRoleHint.get(inputRole.name);
      if (inputRole.derivedFrom !== undefined && inputRole.derivedFrom.length > 0 && hintMatch === undefined) {
        continue;
      }

      const targetOverride = hueTargetOverrides?.[inputRole.name];
      const role = targetOverride === undefined
        ? inputRole
        : { ...inputRole, 'hue': targetOverride.hue, 'hueClamp': targetOverride.hueClamp ?? inputRole.hueClamp };

      if (hintMatch !== undefined) {
        state.roles[role.name] = hintMatch;
        roleProvenance[role.name] = { 'adjustments': [], 'origin': 'stated' };

        context.logger.debug(
          LogBody.create()
            .component('ResolveRoles')
            .operation('run')
            .status(LOG_STATUS.SUCCESS)
            .message('Caller-stated role assigned by hint match')
            .context({ 'role': role.name })
            .build()
        );
        continue;
      }

      if (state.colors.length === 0) {
        if (role.required === true) {
          state.roles[role.name] = RoleSynthesis.forRole(role);
          roleProvenance[role.name] = { 'adjustments': [], 'origin': 'synthesized' };
          context.logger.debug(
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

      let best: ColorRecordInterfaceType | undefined;
      let bestDist = Infinity;
      const distances: Record<string, number> = {};

      for (const color of state.colors) {
        const dist = RoleNudge.distanceToRoleCenter(color, role);
        distances[color.hex] = dist;
        if (dist < bestDist) {
          bestDist = dist;
          best = color;
        }
      }

      const roleDistances = EngineMetadata.get(state.metadata, 'core:roleDistances') ?? {};
      roleDistances[role.name] = distances;
      state.metadata['core:roleDistances'] = roleDistances;

      if (best !== undefined) {
        const resolved = RoleNudge.intoRole(best, role);
        state.roles[role.name] = resolved.record;
        roleProvenance[role.name] = { 'adjustments': resolved.adjustments, 'origin': 'derived' };

        context.logger.debug(
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
        state.roles[role.name] = RoleSynthesis.forRole(role);
        roleProvenance[role.name] = { 'adjustments': [], 'origin': 'synthesized' };
      }
    }
  }
}
/** Singleton instance registered as the `resolve:roles` pipeline task. */
export const resolveRoles = new ResolveRoles();
