import type { ColorRecordEntity } from '../../entities/ColorRecordEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { RelationshipResolutionEntity } from '../../entities/RelationshipResolutionEntity.ts';
import { RoleProvenanceEntity } from '../../entities/RoleProvenanceEntity.ts';
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
  readonly group: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number];
  readonly relationship: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number]['relationships'][number];

  constructor(
    group: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number],
    relationship: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number]['relationships'][number]
  ) {
    this.group = group;
    this.relationship = relationship;
  }
}

class RelationshipOperation {
  static apply(
    group: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number],
    relationship: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number]['relationships'][number],
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
    const graph = state.input.roles?.relationshipGraph;
    if (graph === undefined) {
      return;
    }
    const roles = PaletteRoleState.admit(state.roles);
    const provenance = Metadata.roleProvenance(state.metadata);
    const resolution = Metadata.relationshipResolution(state.metadata);
    const pending = DeriveRoleRelations.workItems(graph.groups);
    const unresolved = DeriveRoleRelations.resolvePending(roles, provenance, resolution, pending);
    DeriveRoleRelations.recordUnresolved(roles, resolution, unresolved);
    roles.commit();
    Metadata.writeRoleProvenance(state.metadata, provenance);
    Metadata.writeRelationshipResolution(state.metadata, resolution);
  }

  private static workItems(
    groups: readonly NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number][]
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
    initialPending: readonly RelationshipWorkItem[]
  ): RelationshipWorkItem[] {
    let pending = [...initialPending];
    let progressed = true;
    while (pending.length > 0 && progressed) {
      progressed = false;
      const next: RelationshipWorkItem[] = [];
      for (let index = 0; index < pending.length; index += 1) {
        const item = pending[index];
        if (item === undefined) {
          continue;
        }
        if (DeriveRoleRelations.resolveItem(roles, provenance, resolution, item)) {
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
    relationship: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number]['relationships'][number]
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

  private static resolveItem(
    roles: PaletteRoleState,
    provenance: ReturnType<typeof Metadata.roleProvenance>,
    resolution: ReturnType<typeof Metadata.relationshipResolution>,
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
        'sources': RelationshipSources.names(relationship),
        ...(relationship.operation === 'hue-offset' && relationship.variantId !== undefined ? { 'variantId': relationship.variantId } : {})
      }));
      return true;
    }
    const sources = DeriveRoleRelations.sourceColors(roles, relationship);
    if (sources === undefined) {
      return false;
    }
    const derived = RelationshipOperation.apply(group, relationship, sources);
    roles.set(relationship.target, derived);
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
      'sources': RelationshipSources.names(relationship),
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
        'sources': sources,
        ...(item.relationship.operation === 'hue-offset' && item.relationship.variantId !== undefined ? { 'variantId': item.relationship.variantId } : {})
      }));
    }
  }
}

/** Singleton task that resolves authored relationship graph operations. */
export const deriveRoleRelations = new DeriveRoleRelations();
