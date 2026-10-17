import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorHintsInterfaceTypeEntity } from '../../entities/ColorHintsInterfaceTypeEntity.ts';
import type { RoleSchemaInterfaceTypeEntity } from '../../entities/RoleSchemaInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import { RoleDefinitionInterfaceTypeEntity } from '../../entities/RoleDefinitionInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from '../../entities/RoleProvenanceInterfaceTypeEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { Metadata } from '../../types/metadata.ts';
import { RoleGeometry } from '../RoleGeometry.ts';

/**
 * Resolves the target hue for a candidate being nudged into a role:
 * an absolute/clamped `hue` target wins when set, otherwise `hueOffset`
 * is applied as a signed relative delta, otherwise the candidate's own hue is left unchanged.
 */
class TargetHue {
  static resolve(h: number, role: RoleDefinitionInterfaceTypeEntity.Type): number {
    if (role.hue !== undefined) {
      const result = RoleGeometry.hueTowards(h, role.hue, role.hueClamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
      return result;
    }
    const result = role.hueOffset === undefined ? h : ((h + role.hueOffset) % 360 + 360) % 360;
    return result;
  }
}

class RoleNudge {
  static clampToRange(value: number, range: readonly [number, number]): number {
    if (value < range[0]) {return range[0];}
    if (value > range[1]) {return range[1];}
    return value;
  }

  static distanceToRoleCenter(color: ColorRecordInterfaceTypeEntity.Type, role: RoleDefinitionInterfaceTypeEntity.Type): number {
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

  static hintsFor(
    candidate: ColorRecordInterfaceTypeEntity.Type,
    role: RoleDefinitionInterfaceTypeEntity.Type
  ): ColorHintsInterfaceTypeEntity.Type | undefined {
    const result = role.intent === undefined
      ? candidate.hints
      : {
        'intent': role.intent,
        ...(candidate.hints?.role === undefined ? {} : { 'role': candidate.hints.role }),
        ...(candidate.hints?.weight === undefined ? {} : { 'weight': candidate.hints.weight })
      };
    return result;
  }

  static copyWithHints(
    candidate: ColorRecordInterfaceTypeEntity.Type,
    hints: ColorHintsInterfaceTypeEntity.Type | undefined
  ): ColorRecordInterfaceTypeEntity.Type {
    const result = ColorRecordInterfaceTypeEntity.create({
      'alpha': candidate.alpha,
      ...(candidate.displayP3 === undefined ? {} : { 'displayP3': candidate.displayP3 }),
      'hex': candidate.hex,
      ...(hints === undefined ? {} : { 'hints': hints }),
      'oklch': candidate.oklch,
      'rgb': candidate.rgb,
      'sourceFormat': candidate.sourceFormat
    });
    return result;
  }

  static intoRole(
    candidate: ColorRecordInterfaceTypeEntity.Type,
    role: RoleDefinitionInterfaceTypeEntity.Type
  ) {
    const { c, h, l } = candidate.oklch;
    const targetL = role.lightnessRange !== undefined ? RoleNudge.clampToRange(l, role.lightnessRange) : l;
    const targetC = role.chromaRange !== undefined ? RoleNudge.clampToRange(c, role.chromaRange) : c;
    const targetH = TargetHue.resolve(h, role);
    const nextHints = RoleNudge.hintsFor(candidate, role);
    const adjustments: RoleProvenanceInterfaceTypeEntity.Type['adjustments'] = [];
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
      record = RoleNudge.copyWithHints(candidate, nextHints);
    }

    const result = { 'adjustments': adjustments, 'record': record };
    return result;
  }
}
class RoleSynthesis {
  static hueFor(role: RoleDefinitionInterfaceTypeEntity.Type): number {
    if (role.hue !== undefined) {
      const result = ((role.hue % 360) + 360) % 360;
      return result;
    }
    const result = role.hueOffset ?? 0;
    return result;
  }

  static forRole(role: RoleDefinitionInterfaceTypeEntity.Type): ColorRecordInterfaceTypeEntity.Type {
    const l = role.lightnessRange !== undefined ? RoleGeometry.rangeCenter(role.lightnessRange) : 0.5;
    const c = role.chromaRange    !== undefined ? RoleGeometry.rangeCenter(role.chromaRange)    : 0;
    const h = RoleSynthesis.hueFor(role);
    const hints: ColorHintsInterfaceTypeEntity.Type | undefined = role.intent === undefined
      ? undefined
      : { 'intent': role.intent };
    const result = colorRecordFactory.fromOklch(l, c, h, { 'alpha': 1, 'hints': hints, 'sourceFormat': 'oklch' });
    return result;
  }
}

/**
 * Pipeline task that assigns one ColorRecord to each non-derived schema role.
 * Explicit role hints are caller-stated records and remain unchanged. Unhinted
 * candidates are resolver-derived and record every colour adjustment.
 */
class RoleCandidateSelection {
  readonly 'color': ColorRecordInterfaceTypeEntity.Type | undefined;
  readonly 'distance': number;
  readonly 'distances': Map<string, number>;

  constructor(
    color: ColorRecordInterfaceTypeEntity.Type | undefined,
    distance: number,
    distances: Map<string, number>
  ) {
    this.color = color;
    this.distance = distance;
    this.distances = distances;
  }
}

class ResolveRoles implements TaskInterface {
  readonly 'name' = 'resolve:roles';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Assigns caller-stated colors by role hint, otherwise resolves the closest candidate into schema constraints and records canonical role provenance.',
    'name':        'resolve:roles',
    'reads':       ['colors', 'input.roles', 'metadata'],
    'writes':      ['roles', 'metadata']
  });

  private static admitRole(
    rawInputRole: RoleSchemaInterfaceTypeEntity.Type['roles'][number]
  ): RoleDefinitionInterfaceTypeEntity.Type {
    const result = RoleDefinitionInterfaceTypeEntity.create({
      'name': rawInputRole.name,
      ...(rawInputRole.chromaRange === undefined ? {} : { 'chromaRange': rawInputRole.chromaRange }),
      ...(rawInputRole.chromaScale === undefined ? {} : { 'chromaScale': rawInputRole.chromaScale }),
      ...(rawInputRole.derivedFrom === undefined ? {} : { 'derivedFrom': rawInputRole.derivedFrom }),
      ...(rawInputRole.description === undefined ? {} : { 'description': rawInputRole.description }),
      ...(rawInputRole.hue === undefined ? {} : { 'hue': rawInputRole.hue }),
      ...(rawInputRole.hueClamp === undefined ? {} : { 'hueClamp': rawInputRole.hueClamp }),
      ...(rawInputRole.hueOffset === undefined ? {} : { 'hueOffset': rawInputRole.hueOffset }),
      ...(rawInputRole.intent === undefined ? {} : { 'intent': rawInputRole.intent }),
      ...(rawInputRole.lightnessOffset === undefined ? {} : { 'lightnessOffset': rawInputRole.lightnessOffset }),
      ...(rawInputRole.lightnessRange === undefined ? {} : { 'lightnessRange': rawInputRole.lightnessRange }),
      ...(rawInputRole.required === undefined ? {} : { 'required': rawInputRole.required })
    });
    return result;
  }

  private static colorsByRoleHint(colors: readonly ColorRecordInterfaceTypeEntity.Type[]): Map<string, ColorRecordInterfaceTypeEntity.Type> {
    const result = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    for (let colorIndex = 0; colorIndex < colors.length; colorIndex += 1) {
      const color = colors[colorIndex];
      const role = color?.hints?.role;
      if (color !== undefined && role !== undefined && !result.has(role)) {
        result.set(role, color);
      }
    }
    return result;
  }

  private static selectCandidate(
    colors: readonly ColorRecordInterfaceTypeEntity.Type[],
    role: RoleDefinitionInterfaceTypeEntity.Type
  ): RoleCandidateSelection {
    let candidate: ColorRecordInterfaceTypeEntity.Type | undefined;
    let distance = Infinity;
    const distances = new Map<string, number>();
    for (let colorIndex = 0; colorIndex < colors.length; colorIndex += 1) {
      const color = colors[colorIndex];
      if (color === undefined) {
        continue;
      }
      const candidateDistance = RoleNudge.distanceToRoleCenter(color, role);
      distances.set(color.hex, candidateDistance);
      if (candidateDistance < distance) {
        candidate = color;
        distance = candidateDistance;
      }
    }
    const result = new RoleCandidateSelection(candidate, distance, distances);
    return result;
  }

  private static overrideRole(
    inputRole: RoleDefinitionInterfaceTypeEntity.Type,
    hueTargetOverrides: ReturnType<typeof Metadata.hueTargetOverrides>
  ): RoleDefinitionInterfaceTypeEntity.Type {
    if (hueTargetOverrides === undefined || !Object.hasOwn(hueTargetOverrides, inputRole.name)) {
      return inputRole;
    }
    const targetOverride = hueTargetOverrides[inputRole.name];
    if (targetOverride === undefined) {
      return inputRole;
    }
    const hueClamp = targetOverride.hueClamp ?? inputRole.hueClamp;
    const result = RoleDefinitionInterfaceTypeEntity.intake({
      'name': inputRole.name,
      ...(inputRole.chromaRange === undefined ? {} : { 'chromaRange': inputRole.chromaRange }),
      ...(inputRole.chromaScale === undefined ? {} : { 'chromaScale': inputRole.chromaScale }),
      ...(inputRole.derivedFrom === undefined ? {} : { 'derivedFrom': inputRole.derivedFrom }),
      ...(inputRole.description === undefined ? {} : { 'description': inputRole.description }),
      'hue': targetOverride.hue,
      ...(hueClamp === undefined ? {} : { 'hueClamp': hueClamp }),
      ...(inputRole.hueOffset === undefined ? {} : { 'hueOffset': inputRole.hueOffset }),
      ...(inputRole.intent === undefined ? {} : { 'intent': inputRole.intent }),
      ...(inputRole.lightnessOffset === undefined ? {} : { 'lightnessOffset': inputRole.lightnessOffset }),
      ...(inputRole.lightnessRange === undefined ? {} : { 'lightnessRange': inputRole.lightnessRange }),
      ...(inputRole.required === undefined ? {} : { 'required': inputRole.required })
    });
    return result;
  }

  private static assignStated(
    role: RoleDefinitionInterfaceTypeEntity.Type,
    color: ColorRecordInterfaceTypeEntity.Type,
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceInterfaceTypeEntity.Type>,
    context: PipelineContextInterface
  ): void {
    roles.set(role.name, color);
    provenance.set(role.name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': [], 'origin': 'stated' }));
    context.logger.debug(
      LogBody.create({
        'component': 'ResolveRoles',
        'context': { 'role': role.name },
        'message': 'Caller-stated role assigned by hint match',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }

  private static synthesize(
    role: RoleDefinitionInterfaceTypeEntity.Type,
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceInterfaceTypeEntity.Type>,
    context: PipelineContextInterface
  ): void {
    if (role.required !== true) {
      return;
    }
    roles.set(role.name, RoleSynthesis.forRole(role));
    provenance.set(role.name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': [], 'origin': 'synthesized' }));
    context.logger.debug(
      LogBody.create({
        'component': 'ResolveRoles',
        'context': { 'role': role.name },
        'message': 'Role synthesized from constraints; no input colors',
        'operation': 'run',
        'status': LOG_STATUS.PARTIAL
      })
    );
  }

  private static assignDerived(
    role: RoleDefinitionInterfaceTypeEntity.Type,
    colors: readonly ColorRecordInterfaceTypeEntity.Type[],
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceInterfaceTypeEntity.Type>,
    distances: Map<string, Map<string, number>>,
    context: PipelineContextInterface
  ): void {
    const selected = ResolveRoles.selectCandidate(colors, role);
    distances.set(role.name, selected.distances);
    if (selected.color === undefined) {
      ResolveRoles.synthesize(role, roles, provenance, context);
      return;
    }
    const resolved = RoleNudge.intoRole(selected.color, role);
    roles.set(role.name, resolved.record);
    provenance.set(role.name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': resolved.adjustments, 'origin': 'derived' }));
    context.logger.debug(
      LogBody.create({
        'component': 'ResolveRoles',
        'context': { 'distance': selected.distance, 'role': role.name },
        'message': 'Role assigned by distance and nudged into range',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }

  private static resolveRole(
    rawInputRole: RoleSchemaInterfaceTypeEntity.Type['roles'][number],
    colorsByRoleHint: Map<string, ColorRecordInterfaceTypeEntity.Type>,
    state: PaletteStateInterface,
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceInterfaceTypeEntity.Type>,
    distances: Map<string, Map<string, number>>,
    hueTargetOverrides: ReturnType<typeof Metadata.hueTargetOverrides>,
    context: PipelineContextInterface
  ): void {
    const inputRole = ResolveRoles.admitRole(rawInputRole);
    const hintMatch = colorsByRoleHint.get(inputRole.name);
    if (inputRole.derivedFrom !== undefined && inputRole.derivedFrom.length > 0 && hintMatch === undefined) {
      return;
    }
    const role = ResolveRoles.overrideRole(inputRole, hueTargetOverrides);
    if (hintMatch !== undefined) {
      ResolveRoles.assignStated(role, hintMatch, roles, provenance, context);
      return;
    }
    if (state.colors.length === 0) {
      ResolveRoles.synthesize(role, roles, provenance, context);
      return;
    }
    ResolveRoles.assignDerived(role, state.colors, roles, provenance, distances, context);
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const schema = state.input.roles;
    if (schema === undefined) {
      context.logger.debug(
        LogBody.create({
          'component': 'ResolveRoles',
          'context': {},
          'message': 'No role schema provided; skipping',
          'operation': 'run',
          'status': LOG_STATUS.SKIPPED
        })
      );
      return;
    }
    const roleDistances = Metadata.roleDistances(state.metadata);
    const roleProvenance = Metadata.roleProvenance(state.metadata);
    const roles = PaletteRoleState.admit(state.roles);
    const colorsByRoleHint = ResolveRoles.colorsByRoleHint(state.colors);
    const hueTargetOverrides = Metadata.hueTargetOverrides(state.metadata);
    for (let roleIndex = 0; roleIndex < schema.roles.length; roleIndex += 1) {
      const inputRole = schema.roles[roleIndex];
      if (inputRole !== undefined) {
        ResolveRoles.resolveRole(
          inputRole,
          colorsByRoleHint,
          state,
          roles,
          roleProvenance,
          roleDistances,
          hueTargetOverrides,
          context
        );
      }
    }
    roles.commit();
    if (roleDistances.size > 0) {
      Metadata.writeRoleDistances(state.metadata, roleDistances);
    }
    Metadata.writeRoleProvenance(state.metadata, roleProvenance);
  }
}
/** Singleton instance registered as the `resolve:roles` pipeline task. */
export const resolveRoles = new ResolveRoles();
