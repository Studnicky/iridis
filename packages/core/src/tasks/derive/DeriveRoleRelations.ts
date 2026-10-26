import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';
import type { RelationshipGraphShape } from '../../model/RelationshipGraphShape.ts';

import { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import { RelationshipResolutionEntity } from '../../entities/RelationshipResolutionEntity.ts';
import { RoleDefinitionEntity } from '../../entities/RoleDefinitionEntity.ts';
import { RoleProvenanceEntity } from '../../entities/RoleProvenanceEntity.ts';
import { RoleRelationshipGraphEntity } from '../../entities/RoleRelationshipGraphEntity.ts';
import { TaskManifestEntity } from '../../entities/TaskManifestEntity.ts';
import { PaletteRoleState } from '../../interfaces/PaletteStateInterface.ts';
import { alphaOverlay } from '../../math/AlphaOverlay.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';
import { mixOklch } from '../../math/MixOklch.ts';
import { RelationshipHueDegrees } from '../../model/RelationshipHueDegrees.ts';
import { RelationshipSources } from '../../model/RelationshipSources.ts';
import { Metadata } from '../../types/metadata.ts';
import { RoleGeometry } from '../RoleGeometry.ts';

class RelationshipWorkItem {
  readonly group: RelationshipGraphShape.GroupInterface;
  readonly relationship: RelationshipGraphShape.GroupInterface['relationships'][number];

  constructor(
    group: RelationshipGraphShape.GroupInterface,
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number]
  ) {
    this.group = group;
    this.relationship = relationship;
  }
}

class RelationshipOperation {
  static apply(
    group: RelationshipGraphShape.GroupInterface,
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number],
    sources: readonly ColorRecordEntity.Type[],
    target: RoleDefinitionEntity.Type
  ): ColorRecordEntity.Type {
    const operationResult = RelationshipOperation.applyRaw(group, relationship, sources);
    if (target.lightnessRange === undefined && target.chromaRange === undefined) {
      const result = RelationshipOperation.forTarget(operationResult, target);
      return result;
    }
    const ownsTarget = relationship.operation === 'hue-target' && (
      relationship.source === undefined || relationship.source === relationship.target
    );
    if (ownsTarget) {
      const result = RelationshipOperation.forTarget(operationResult, target);
      return result;
    }
    const options = {
      'chromaRange': target.chromaRange,
      'lightnessRange': target.lightnessRange
    };
    const mode = RelationshipOperation.coordinateMode(relationship);
    const envelope = RoleGeometry.relationshipCoordinates(
      operationResult.oklch.l,
      operationResult.oklch.c,
      options,
      { 'chroma': mode, 'lightness': mode }
    );
    const result = colorRecordFactory.fromOklch(
      envelope.lightness,
      envelope.chroma,
      operationResult.oklch.h,
      { 'alpha': operationResult.alpha }
    );
    const targetResult = RelationshipOperation.forTarget(result, target);
    return targetResult;
  }

  private static forTarget(record: ColorRecordEntity.Type, target: RoleDefinitionEntity.Type): ColorRecordEntity.Type {
    const hints = target.intent === undefined
      ? undefined
      : { 'intent': target.intent };
    const result = ColorRecordEntity.create({
      'alpha': record.alpha,
      ...(record.displayP3 === undefined ? {} : { 'displayP3': record.displayP3 }),
      'hex': record.hex,
      ...(hints === undefined ? {} : { 'hints': hints }),
      'oklch': record.oklch,
      'rgb': record.rgb,
      'sourceFormat': record.sourceFormat
    });
    return result;
  }

  private static coordinateMode(
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number]
  ) {
    const explicit = relationship.operation === 'alpha-overlay'
      || relationship.operation === 'oklch-interpolate'
      || (relationship.operation === 'oklch-delta' && (
        relationship.chromaScale !== undefined || relationship.lightnessOffset !== undefined
      ));
    const result = explicit ? RoleGeometry.clampMode : RoleGeometry.midpointMode;
    return result;
  }

  private static applyRaw(
    group: RelationshipGraphShape.GroupInterface,
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number],
    sources: readonly ColorRecordEntity.Type[]
  ): ColorRecordEntity.Type {
    if (relationship.operation === 'alias') {
      const source = sources[0];
      if (source === undefined) {
        throw new TypeError('alias relationship requires one source');
      }
      const result = source;
      return result;
    }
    if (relationship.operation === 'alpha-overlay') {
      const base = sources[0];
      const overlay = sources[1];
      if (base === undefined || overlay === undefined) {
        throw new TypeError('alpha-overlay relationship requires base and overlay sources');
      }
      const result = alphaOverlay.apply(base, overlay, relationship.alpha);
      return result;
    }
    if (relationship.operation === 'oklch-interpolate') {
      const source = sources[0];
      const toward = sources[1];
      if (source === undefined || toward === undefined) {
        throw new TypeError('oklch-interpolate relationship requires source and toward sources');
      }
      const result = mixOklch.apply(source, toward, relationship.weight);
      return result;
    }
    const source = sources[0];
    if (source === undefined) {
      throw new TypeError(`${relationship.operation} relationship requires one source`);
    }
    if (relationship.operation === 'oklch-delta') {
      const result = colorRecordFactory.fromOklch(
        source.oklch.l + (relationship.lightnessOffset ?? 0),
        source.oklch.c * (relationship.chromaScale ?? 1),
        source.oklch.h + (relationship.hueOffset ?? 0),
        { 'alpha': source.alpha }
      );
      return result;
    }
    if (relationship.operation === 'hue-target') {
      const result = colorRecordFactory.fromOklch(
        source.oklch.l,
        source.oklch.c,
        RoleGeometry.hueTowards(source.oklch.h, relationship.hue, relationship.clamp ?? RoleGeometry.DEFAULT_HUE_CLAMP),
        { 'alpha': source.alpha }
      );
      return result;
    }
    const degrees = RelationshipHueDegrees.resolve(group, relationship);
    const result = colorRecordFactory.fromOklch(
      source.oklch.l,
      source.oklch.c,
      RoleGeometry.hueTowards(source.oklch.h, source.oklch.h + degrees, Math.abs(degrees)),
      { 'alpha': source.alpha }
    );
    return result;
  }
}

class DeriveRoleRelations implements TaskInterface {
  readonly 'name' = 'derive:roleRelations';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Resolves authored role relationship graphs into palette roles and records exact relationship baselines.',
    'name': 'derive:roleRelations',
    'reads': ['input.roles', 'metadata', 'roles'],
    'writes': ['metadata', 'roles']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const graph = state.input.roles?.relationshipGraph === undefined
      ? undefined
      : RoleRelationshipGraphEntity.intake(state.input.roles.relationshipGraph);
    if (graph === undefined) {
      return;
    }
    const roles = PaletteRoleState.admit(state.roles);
    const provenance = Metadata.roleProvenance(state.metadata);
    const resolution = Metadata.relationshipResolution(state.metadata);
    const distances = Metadata.roleDistances(state.metadata);
    const targets = new Map(state.input.roles?.roles.map((role) => {
      return [role.name, RoleDefinitionEntity.intake(role)] as const;
    }) ?? []);
    const pending = DeriveRoleRelations.workItems(graph.groups);
    const unresolved = DeriveRoleRelations.resolvePending(roles, provenance, resolution, distances, targets, pending);
    DeriveRoleRelations.recordUnresolved(roles, resolution, unresolved);
    roles.commit();
    Metadata.writeRoleProvenance(state.metadata, provenance);
    Metadata.writeRelationshipResolution(state.metadata, resolution);
    Metadata.writeRoleDistances(state.metadata, distances);
  }

  private static workItems(
    groups: readonly RelationshipGraphShape.GroupInterface[]
  ): RelationshipWorkItem[] {
    const result = groups.flatMap((group) => {
      const items = group.relationships.map((relationship) => {
        const item = new RelationshipWorkItem(group, relationship);
        return item;
      });
      return items;
    });
    result.sort((left, right) => {
      const priority = left.relationship.priority - right.relationship.priority;
      const result = priority === 0
        ? left.relationship.id.localeCompare(right.relationship.id)
        : priority;
      return result;
    });
    return result;
  }

  private static resolvePending(
    roles: PaletteRoleState,
    provenance: ReturnType<typeof Metadata.roleProvenance>,
    resolution: ReturnType<typeof Metadata.relationshipResolution>,
    distances: ReturnType<typeof Metadata.roleDistances>,
    targets: ReadonlyMap<string, RoleDefinitionEntity.Type>,
    initialPending: readonly RelationshipWorkItem[]
  ): RelationshipWorkItem[] {
    let pending = [...initialPending];
    let progressed = true;
    while (pending.length > 0 && progressed) {
      progressed = false;
      const pendingTargets = new Set(pending.map((item) => { return item.relationship.target; }));
      const next: RelationshipWorkItem[] = [];
      for (let index = 0; index < pending.length; index += 1) {
        const item = pending[index];
        if (item === undefined) {
          continue;
        }
        if (DeriveRoleRelations.resolveItem(roles, provenance, resolution, distances, pendingTargets, targets, item)) {
          progressed = true;
        } else {
          next.push(item);
        }
      }
      pending = next;
    }
    return pending;
  }

  private static sourceColors(
    roles: PaletteRoleState,
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number]
  ): readonly ColorRecordEntity.Type[] | undefined {
    const names = RelationshipSources.names(relationship);
    const colors: ColorRecordEntity.Type[] = [];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const color = name === undefined ? undefined : roles.get(name);
      if (color === undefined) {
        return undefined;
      }
      colors.push(color);
    }
    return colors;
  }

  private static sourcesFor(
    roles: PaletteRoleState,
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number],
    existing: ColorRecordEntity.Type | undefined
  ): readonly ColorRecordEntity.Type[] | undefined {
    const ownsTarget = DeriveRoleRelations.ownsTarget(relationship);
    if (ownsTarget) {
      if (existing === undefined) {
        return undefined;
      }
      const result = [existing];
      return result;
    }
    const result = DeriveRoleRelations.sourceColors(roles, relationship);
    return result;
  }

  private static ownsTarget(
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number]
  ): boolean {
    const result = relationship.operation === 'hue-target' && (
      relationship.source === undefined || relationship.source === relationship.target
    );
    return result;
  }

  private static sourcePending(
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number],
    pendingTargets: ReadonlySet<string>
  ): boolean {
    if (DeriveRoleRelations.ownsTarget(relationship)) {
      return false;
    }
    const result = RelationshipSources.names(relationship).some((source) => {
      const pending = pendingTargets.has(source);
      return pending;
    });
    return result;
  }

  private static resolveItem(
    roles: PaletteRoleState,
    provenance: ReturnType<typeof Metadata.roleProvenance>,
    resolution: ReturnType<typeof Metadata.relationshipResolution>,
    distances: ReturnType<typeof Metadata.roleDistances>,
    pendingTargets: ReadonlySet<string>,
    targets: ReadonlyMap<string, RoleDefinitionEntity.Type>,
    item: RelationshipWorkItem
  ): boolean {
    const { group, relationship } = item;
    const existing = roles.get(relationship.target);
    if (existing !== undefined && provenance.get(relationship.target)?.origin === 'stated') {
      resolution.set(relationship.target, RelationshipResolutionEntity.create({
        'after': existing,
        'before': existing,
        'blockedReason': 'stated-target',
        'disposition': 'preserved-stated',
        'groupId': group.id,
        'modeId': group.defaultMode,
        'operation': relationship.operation,
        'relationshipId': relationship.id,
        'sources': [...RelationshipSources.names(relationship)],
        ...(relationship.operation === 'hue-offset' && relationship.variantId !== undefined ? { 'variantId': relationship.variantId } : {})
      }));
      return true;
    }
    const target = targets.get(relationship.target);
    if (target === undefined) {
      throw new TypeError(`${relationship.target} relationship target is not declared`);
    }
    const ownsTarget = DeriveRoleRelations.ownsTarget(relationship);
    const sourcePending = DeriveRoleRelations.sourcePending(relationship, pendingTargets);
    if (sourcePending) {
      return false;
    }
    const sources = DeriveRoleRelations.sourcesFor(roles, relationship, existing);
    if (sources === undefined) {
      return false;
    }
    const derived = RelationshipOperation.apply(group, relationship, sources, target);
    roles.set(relationship.target, derived);
    if (!ownsTarget) {
      distances.delete(relationship.target);
    }
    if (!provenance.has(relationship.target)) {
      provenance.set(relationship.target, RoleProvenanceEntity.create({ 'adjustments': [], 'origin': 'derived' }));
    }
    resolution.set(relationship.target, RelationshipResolutionEntity.create({
      'after': derived,
      ...(existing === undefined ? {} : { 'before': existing }),
      'disposition': 'applied',
      'groupId': group.id,
      'modeId': relationship.operation === 'hue-offset' ? relationship.modeId ?? group.defaultMode : group.defaultMode,
      'operation': relationship.operation,
      'relationshipId': relationship.id,
      'sources': [...RelationshipSources.names(relationship)],
      ...(relationship.operation === 'hue-offset' && relationship.variantId !== undefined ? { 'variantId': relationship.variantId } : {})
    }));
    return true;
  }

  private static recordUnresolved(
    roles: PaletteRoleState,
    resolution: ReturnType<typeof Metadata.relationshipResolution>,
    unresolved: readonly RelationshipWorkItem[]
  ): void {
    const unresolvedTargets = new Set<string>(unresolved.map((item) => {
      const result = item.relationship.target;
      return result;
    }));
    for (let index = 0; index < unresolved.length; index += 1) {
      const item = unresolved[index];
      if (item === undefined) {
        continue;
      }
      const sources = RelationshipSources.names(item.relationship);
      const missing = sources.some((source) => {
        const result = !roles.has(source) && !unresolvedTargets.has(source);
        return result;
      });
      const existing = roles.get(item.relationship.target);
      resolution.set(item.relationship.target, RelationshipResolutionEntity.create({
        ...(existing === undefined ? {} : { 'before': existing }),
        'blockedReason': missing ? 'missing-source' : 'cycle',
        'disposition': 'unresolved',
        'groupId': item.group.id,
        'modeId': item.group.defaultMode,
        'operation': item.relationship.operation,
        'relationshipId': item.relationship.id,
        'sources': [...sources],
        ...(item.relationship.operation === 'hue-offset' && item.relationship.variantId !== undefined ? { 'variantId': item.relationship.variantId } : {})
      }));
    }
  }
}

/** Singleton task that resolves authored relationship graph operations. */
export const deriveRoleRelations = new DeriveRoleRelations();
