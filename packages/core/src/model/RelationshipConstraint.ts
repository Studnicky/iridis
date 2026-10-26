import type { JSONSchema7Type } from 'json-schema';

import type { InputEntity } from '../entities/InputEntity.ts';
import type { ColorCoordinate } from '../math/ColorCoordinate.ts';
import type { RelationshipGraphShape } from './RelationshipGraphShape.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import { RelationshipResolutionEntity } from '../entities/RelationshipResolutionEntity.ts';
import { RelationshipToleranceEntity } from '../entities/RelationshipToleranceEntity.ts';
import { RoleRelationshipEntity } from '../entities/RoleRelationshipEntity.ts';
import { RoleRelationshipGraphEntity } from '../entities/RoleRelationshipGraphEntity.ts';
import { RoleRelationshipGroupEntity } from '../entities/RoleRelationshipGroupEntity.ts';
import { Metadata } from '../types/metadata.ts';
import { RelationshipConstraintDomain } from './RelationshipConstraintDomain.ts';
import { RelationshipHueDegrees } from './RelationshipHueDegrees.ts';
import { RelationshipSources } from './RelationshipSources.ts';

class RelationshipConstraintContext {
  readonly domains = new Map<string, RelationshipConstraintDomain | undefined>();
  readonly graph: RoleRelationshipGraphEntity.Type;
  readonly resolutions: ReturnType<typeof Metadata.relationshipResolution>;

  constructor(
    graph: RoleRelationshipGraphEntity.Type,
    resolutions: ReturnType<typeof Metadata.relationshipResolution>
  ) {
    this.graph = graph;
    this.resolutions = resolutions;
  }
}

class RelationshipConstraintGraphContext {
  readonly graph: RoleRelationshipGraphEntity.Type;
  readonly resolutions = new WeakMap<object, RelationshipConstraintContext>();

  constructor(graph: RoleRelationshipGraphEntity.Type) {
    this.graph = graph;
  }
}

/** Reads authored graph relationships and their optional exact runtime constraint baselines. */
export class RelationshipConstraint {
  static readonly #contexts = new WeakMap<object, RelationshipConstraintGraphContext>();

  static allows(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string,
    candidate: ColorRecordEntity.Type
  ): boolean {
    const result = RelationshipConstraint.allowsCoordinates(
      input,
      metadata,
      roleName,
      candidate.alpha,
      candidate.oklch
    );
    return result;
  }

  static allowsCoordinates(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string,
    alpha: number,
    candidate: Readonly<Pick<ColorCoordinate, 'c' | 'h' | 'l'>>
  ): boolean {
    const domain = RelationshipConstraint.domain(input, metadata, roleName);
    const result = RelationshipConstraint.allowsDomain(domain, alpha, candidate);
    return result;
  }

  static allowsDomain(
    domain: RelationshipConstraintDomain | undefined,
    alpha: number,
    candidate: Readonly<Pick<ColorCoordinate, 'c' | 'h' | 'l'>>
  ): boolean {
    const baseline = domain?.baseline;
    if (domain === undefined || baseline === undefined) {
      return true;
    }
    const result = RelationshipConstraint.allowsState(
      domain,
      baseline,
      alpha,
      candidate.c,
      candidate.h,
      candidate.l
    );
    return result;
  }

  static domain(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string
  ): RelationshipConstraintDomain | undefined {
    const graphSource = input.roles?.relationshipGraph;
    if (graphSource === undefined) {
      return undefined;
    }
    const context = RelationshipConstraint.context(metadata, graphSource);
    if (context.domains.has(roleName)) {
      const result = context.domains.get(roleName);
      return result;
    }
    const resolution = context.resolutions.get(roleName);
    const selected = RelationshipConstraint.selectedRelation(context.graph.groups, resolution, roleName);
    if (selected === undefined) {
      context.domains.set(roleName, undefined);
      return undefined;
    }
    const group = RoleRelationshipGroupEntity.intake(selected.group);
    const relationship = RoleRelationshipEntity.intake(selected.relationship);
    const baseline = resolution?.after === undefined
      ? undefined
      : ColorRecordEntity.intake(resolution.after);
    const modeId = resolution?.modeId ?? (relationship.operation === 'hue-offset'
      ? relationship.modeId ?? group.defaultMode
      : group.defaultMode);
    const hueDegrees = relationship.operation === 'hue-offset'
      ? RelationshipHueDegrees.resolve(group, relationship)
      : undefined;
    const tolerance = relationship.relaxability === 'tolerant'
      ? RelationshipToleranceEntity.intake(relationship.tolerance)
      : undefined;
    const result = new RelationshipConstraintDomain({
      'baseline': baseline,
      'groupId': group.id,
      'hueDegrees': hueDegrees,
      'modeId': modeId,
      'relationship': relationship,
      'sources': RelationshipSources.names(relationship),
      'tolerance': tolerance
    });
    context.domains.set(roleName, result);
    return result;
  }

  private static context(
    metadata: Record<string, JSONSchema7Type>,
    graphSource: object
  ): RelationshipConstraintContext {
    let graphContext = RelationshipConstraint.#contexts.get(graphSource);
    if (graphContext === undefined) {
      graphContext = new RelationshipConstraintGraphContext(
        RoleRelationshipGraphEntity.intake(graphSource)
      );
      RelationshipConstraint.#contexts.set(graphSource, graphContext);
    }
    const resolutionSource = metadata['core:relationshipResolution'];
    if (
      resolutionSource === undefined ||
      typeof resolutionSource !== 'object' ||
      resolutionSource === null ||
      Array.isArray(resolutionSource)
    ) {
      return new RelationshipConstraintContext(
        graphContext.graph,
        Metadata.relationshipResolution(metadata)
      );
    }
    let result = graphContext.resolutions.get(resolutionSource);
    if (result === undefined) {
      result = new RelationshipConstraintContext(
        graphContext.graph,
        Metadata.relationshipResolution(metadata)
      );
      graphContext.resolutions.set(resolutionSource, result);
    }
    return result;
  }

  static relationIds(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleNames: readonly string[]
  ): string[] {
    const relationIds = new Set<string>();
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const state = RelationshipConstraint.domain(input, metadata, roleName);
      if (state?.baseline !== undefined) {
        relationIds.add(state.relationId);
      }
    }
    const result = Array.from(relationIds);
    result.sort((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }

  static recordDeviation(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string,
    candidate: ColorRecordEntity.Type
  ): void {
    const state = RelationshipConstraint.domain(input, metadata, roleName);
    const baseline = state?.baseline;
    if (state?.tolerance === undefined || baseline === undefined) {
      return;
    }
    const resolutions = Metadata.relationshipResolution(metadata);
    const resolution = resolutions.get(roleName);
    if (resolution === undefined) {
      return;
    }
    const deviation = RelationshipToleranceEntity.create({
      'alpha': Math.abs(candidate.alpha - baseline.alpha),
      'chroma': Math.abs(candidate.oklch.c - baseline.oklch.c),
      'hue': RelationshipConstraint.hueDifference(candidate.oklch.h, baseline.oklch.h),
      'lightness': Math.abs(candidate.oklch.l - baseline.oklch.l)
    });
    resolutions.set(roleName, RelationshipResolutionEntity.create({
      ...resolution,
      'deviation': deviation
    }));
    Metadata.writeRelationshipResolution(metadata, resolutions);
  }

  static limitsMovement(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string
  ): boolean {
    const result = RelationshipConstraint.domain(input, metadata, roleName)?.baseline !== undefined;
    return result;
  }

  private static selectedRelation(
    groups: RelationshipGraphShape.GraphInterface['groups'],
    resolution: ReturnType<typeof Metadata.relationshipResolution> extends Map<string, infer Value> ? Value | undefined : never,
    roleName: string
  ): Readonly<{
    'group': RelationshipGraphShape.GroupInterface;
    'relationship': RelationshipGraphShape.GroupInterface['relationships'][number];
  }> | undefined {
    if (resolution !== undefined) {
      const group = groups.find((candidate) => {
        const result = candidate.id === resolution.groupId;
        return result;
      });
      const relationship = group?.relationships.find((candidate) => {
        const result = candidate.id === resolution.relationshipId;
        return result;
      });
      if (group !== undefined && relationship !== undefined) {
        return { 'group': group, 'relationship': relationship };
      }
      return undefined;
    }
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      if (group === undefined) {
        continue;
      }
      const relationship = group.relationships.find((candidate) => {
        const result = candidate.target === roleName;
        return result;
      });
      if (relationship !== undefined) {
        return { 'group': group, 'relationship': relationship };
      }
    }
    return undefined;
  }

  private static allowsState(
    state: RelationshipConstraintDomain,
    baseline: ColorRecordEntity.Type,
    alpha: number,
    chroma: number,
    hue: number,
    lightness: number
  ): boolean {
    const tolerance = state.tolerance;
    if (tolerance === undefined) {
      const result =
        alpha === baseline.alpha &&
        lightness === baseline.oklch.l &&
        chroma === baseline.oklch.c &&
        hue === baseline.oklch.h;
      return result;
    }
    const result =
      RelationshipConstraint.within(alpha, baseline.alpha, tolerance.alpha) &&
      RelationshipConstraint.within(chroma, baseline.oklch.c, tolerance.chroma) &&
      RelationshipConstraint.withinHue(hue, baseline.oklch.h, tolerance.hue) &&
      RelationshipConstraint.within(lightness, baseline.oklch.l, tolerance.lightness);
    return result;
  }

  private static within(
    candidate: number,
    baseline: number,
    tolerance: number | undefined
  ): boolean {
    const difference = Math.abs(candidate - baseline);
    const result = tolerance === undefined
      ? difference === 0
      : difference <= tolerance;
    return result;
  }

  private static withinHue(
    candidate: number,
    baseline: number,
    tolerance: number | undefined
  ): boolean {
    const difference = RelationshipConstraint.hueDifference(candidate, baseline);
    const result = tolerance === undefined
      ? difference === 0
      : difference <= tolerance;
    return result;
  }

  private static hueDifference(left: number, right: number): number {
    const result = Math.abs(((left - right + 540) % 360) - 180);
    return result;
  }
}
