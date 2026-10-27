import type { JSONSchema7Type } from 'json-schema';

import type { InputEntity } from '../entities/InputEntity.ts';
import type { ColorCoordinate } from '../math/ColorCoordinate.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import { RelationshipResolutionEntity } from '../entities/RelationshipResolutionEntity.ts';
import { RelationshipToleranceEntity } from '../entities/RelationshipToleranceEntity.ts';
import { RoleRelationshipEntity } from '../entities/RoleRelationshipEntity.ts';
import { RoleRelationshipGraphEntity } from '../entities/RoleRelationshipGraphEntity.ts';
import { RoleRelationshipGroupEntity } from '../entities/RoleRelationshipGroupEntity.ts';
import { hueResolutionChroma } from '../math/HueResolutionChroma.ts';
import { Metadata } from '../types/metadata.ts';
import { CompositeKey } from './CompositeKey.ts';
import { RelationshipConstraintDomain } from './RelationshipConstraintDomain.ts';
import { RelationshipHueDegrees } from './RelationshipHueDegrees.ts';
import { RelationshipSources } from './RelationshipSources.ts';
import { WeakIdentityMemo } from './WeakIdentityMemo.ts';

class RelationshipSelection {
  readonly group: RoleRelationshipGroupEntity.Type;
  readonly relationship: RoleRelationshipEntity.Type;

  constructor(
    group: RoleRelationshipGroupEntity.Type,
    relationship: RoleRelationshipEntity.Type
  ) {
    this.group = group;
    this.relationship = relationship;
  }
}

class RelationshipConstraintContext {
  readonly domains = new Map<string, RelationshipConstraintDomain | undefined>();
  readonly graphContext: RelationshipConstraintGraphContext;
  readonly metadata: Record<string, JSONSchema7Type>;

  constructor(
    graphContext: RelationshipConstraintGraphContext,
    metadata: Record<string, JSONSchema7Type>
  ) {
    this.graphContext = graphContext;
    this.metadata = metadata;
  }
}

class RelationshipConstraintGraphContext {
  readonly graph: RoleRelationshipGraphEntity.Type;
  readonly selectionsByIdentifier = new Map<string, RelationshipSelection>();
  readonly selectionsByTarget = new Map<string, RelationshipSelection>();

  constructor(graph: RoleRelationshipGraphEntity.Type) {
    this.graph = graph;
    for (let groupIndex = 0; groupIndex < graph.groups.length; groupIndex += 1) {
      const rawGroup = graph.groups[groupIndex];
      if (rawGroup === undefined) {
        continue;
      }
      const group = RoleRelationshipGroupEntity.intake(rawGroup);
      for (let relationshipIndex = 0; relationshipIndex < group.relationships.length; relationshipIndex += 1) {
        const rawRelationship = group.relationships[relationshipIndex];
        if (rawRelationship === undefined) {
          continue;
        }
        const relationship = RoleRelationshipEntity.intake(rawRelationship);
        const selection = new RelationshipSelection(group, relationship);
        this.selectionsByIdentifier.set(
          CompositeKey.of(group.id, relationship.id),
          selection
        );
        this.selectionsByTarget.set(relationship.target, selection);
      }
    }
  }

  selection(
    resolution: RelationshipResolutionEntity.Type | undefined,
    roleName: string
  ): RelationshipSelection | undefined {
    const result = resolution === undefined
      ? this.selectionsByTarget.get(roleName)
      : this.selectionsByIdentifier.get(
        CompositeKey.of(resolution.groupId, resolution.relationshipId)
      );
    return result;
  }
}

/** Reads authored graph relationships and their optional exact runtime constraint baselines. */
export class RelationshipConstraint {
  static readonly #contexts = new WeakIdentityMemo<object, RelationshipConstraintGraphContext>();
  static readonly #resolutionContexts = WeakIdentityMemo.pair<object, object, RelationshipConstraintContext>();

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
    const resolution = Metadata.relationshipResolutionForRole(context.metadata, roleName);
    const selected = context.graphContext.selection(resolution, roleName);
    if (selected === undefined) {
      context.domains.set(roleName, undefined);
      return undefined;
    }
    const group = selected.group;
    const relationship = selected.relationship;
    const baseline = resolution?.after === undefined
      ? undefined
      : ColorRecordEntity.intake(resolution.after);
    const modeId = resolution?.modeId ?? RelationshipHueDegrees.modeId(group, relationship);
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
    const graphContext = RelationshipConstraint.graphContext(graphSource);
    const resolutionSource = metadata['core:relationshipResolution'];
    if (
      resolutionSource === undefined ||
      typeof resolutionSource !== 'object' ||
      resolutionSource === null ||
      Array.isArray(resolutionSource)
    ) {
      return new RelationshipConstraintContext(graphContext, metadata);
    }
    const result = RelationshipConstraint.#resolutionContexts.get(graphSource, resolutionSource, () => {
      const next = new RelationshipConstraintContext(graphContext, metadata);
      return next;
    });
    return result;
  }

  static relationIds(
    input: InputEntity.Type,
    roleNames: readonly string[]
  ): string[] {
    const graphSource = input.roles?.relationshipGraph;
    if (graphSource === undefined) {
      return [];
    }
    const context = RelationshipConstraint.graphContext(graphSource);
    const relationIds = new Set<string>();
    for (let index = 0; index < roleNames.length; index += 1) {
      const roleName = roleNames[index];
      if (roleName === undefined) {
        continue;
      }
      const relationId = context.selectionsByTarget.get(roleName)?.relationship.id;
      if (relationId !== undefined) {
        relationIds.add(relationId);
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

  private static graphContext(
    graphSource: object
  ): RelationshipConstraintGraphContext {
    const result = RelationshipConstraint.#contexts.get(graphSource, () => {
      const graph = RoleRelationshipGraphEntity.intake(graphSource);
      const context = new RelationshipConstraintGraphContext(graph);
      return context;
    });
    return result;
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
        RelationshipConstraint.hueMatches(chroma, baseline.oklch.c, hue, baseline.oklch.h, undefined);
      return result;
    }
    const result =
      RelationshipConstraint.within(alpha, baseline.alpha, tolerance.alpha) &&
      RelationshipConstraint.within(chroma, baseline.oklch.c, tolerance.chroma) &&
      RelationshipConstraint.hueMatches(chroma, baseline.oklch.c, hue, baseline.oklch.h, tolerance.hue) &&
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

  private static hueMatches(
    candidateChroma: number,
    baselineChroma: number,
    candidateHue: number,
    baselineHue: number,
    tolerance: number | undefined
  ): boolean {
    if (candidateChroma < hueResolutionChroma || baselineChroma < hueResolutionChroma) {
      return true;
    }
    const result = RelationshipConstraint.withinHue(candidateHue, baselineHue, tolerance);
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
