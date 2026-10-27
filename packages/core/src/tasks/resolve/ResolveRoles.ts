import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorHintsEntity } from '../../entities/ColorHintsEntity.ts';
import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { RoleSchemaEntity } from '../../entities/RoleSchemaEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { RoleProvenanceEntity } from '../../entities/RoleProvenanceEntity.ts';
import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { RoleRecord } from '../../model/RoleRecord.ts';
import { Metadata } from '../../types/metadata.ts';
import { RoleGeometry } from '../RoleGeometry.ts';

class RoleNudge {
  static distanceToRoleCenter(color: ColorRecordEntity.Type, role: RoleSchemaEntity.Type['roles'][number]): number {
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
    candidate: ColorRecordEntity.Type,
    role: RoleSchemaEntity.Type['roles'][number]
  ): ColorHintsEntity.Type | undefined {
    const result = role.intent === undefined
      ? candidate.hints
      : {
        'intent': role.intent,
        ...(candidate.hints?.role === undefined ? {} : { 'role': candidate.hints.role }),
        ...(candidate.hints?.weight === undefined ? {} : { 'weight': candidate.hints.weight })
      };
    return result;
  }

  static intoRole(
    candidate: ColorRecordEntity.Type,
    role: RoleSchemaEntity.Type['roles'][number]
  ) {
    const { c, h, l } = candidate.oklch;
    const targetL = role.lightnessRange !== undefined ? RoleGeometry.clampRange(l, role.lightnessRange) : l;
    const targetC = role.chromaRange !== undefined ? RoleGeometry.clampRange(c, role.chromaRange) : c;
    const targetH = h;
    const nextHints = RoleNudge.hintsFor(candidate, role);
    const adjustments: RoleProvenanceEntity.Type['adjustments'] = [];
    let record = candidate;

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
      record = RoleRecord.withHints(candidate, nextHints);
    }

    const result = { 'adjustments': adjustments, 'record': record };
    return result;
  }
}
class RoleSynthesis {
  static hueFor(): number {
    return 0;
  }

  static forRole(role: RoleSchemaEntity.Type['roles'][number]): ColorRecordEntity.Type {
    const l = role.lightnessRange !== undefined ? RoleGeometry.rangeCenter(role.lightnessRange) : 0.5;
    const c = role.chromaRange    !== undefined ? RoleGeometry.rangeCenter(role.chromaRange)    : 0;
    const h = RoleSynthesis.hueFor();
    const hints: ColorHintsEntity.Type | undefined = role.intent === undefined
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
  readonly 'color': ColorRecordEntity.Type | undefined;
  readonly 'distance': number;
  readonly 'distances': Map<string, number>;

  constructor(
    color: ColorRecordEntity.Type | undefined,
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

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Assigns caller-stated colors by role hint, otherwise resolves the closest candidate into schema constraints and records canonical role provenance.',
    'name':        'resolve:roles',
    'reads':       ['colors', 'input.roles', 'metadata'],
    'writes':      ['roles', 'metadata']
  });

  private static colorsByRoleHint(colors: readonly ColorRecordEntity.Type[]): Map<string, ColorRecordEntity.Type> {
    const result = new Map<string, ColorRecordEntity.Type>();
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
    colors: readonly ColorRecordEntity.Type[],
    role: RoleSchemaEntity.Type['roles'][number]
  ): RoleCandidateSelection {
    let candidate: ColorRecordEntity.Type | undefined;
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

  private static assignStated(
    role: RoleSchemaEntity.Type['roles'][number],
    color: ColorRecordEntity.Type,
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceEntity.Type>,
    context: PipelineContextInterface
  ): void {
    roles.set(role.name, color);
    provenance.set(role.name, RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'stated' }));
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
    role: RoleSchemaEntity.Type['roles'][number],
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceEntity.Type>,
    context: PipelineContextInterface
  ): void {
    if (role.required !== true) {
      return;
    }
    roles.set(role.name, RoleSynthesis.forRole(role));
    provenance.set(role.name, RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'synthesized' }));
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
    role: RoleSchemaEntity.Type['roles'][number],
    colors: readonly ColorRecordEntity.Type[],
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceEntity.Type>,
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
    provenance.set(role.name, RoleProvenanceEntity.create({ 'adjustments': resolved.adjustments, 'origin': 'derived' }));
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
    rawInputRole: RoleSchemaEntity.Type['roles'][number],
    colorsByRoleHint: Map<string, ColorRecordEntity.Type>,
    state: PaletteStateInterface,
    roles: PaletteRoleState,
    provenance: Map<string, RoleProvenanceEntity.Type>,
    distances: Map<string, Map<string, number>>,
    context: PipelineContextInterface
  ): void {
    const role = rawInputRole;
    const hintMatch = colorsByRoleHint.get(role.name);
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
