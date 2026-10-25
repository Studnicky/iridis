import type { JSONSchema7Type } from 'json-schema';

import type { InputEntity } from '../entities/InputEntity.ts';
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

/** Reads authored graph relationships and their optional exact runtime constraint baselines. */
export class RelationshipConstraint {
  static allows(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string,
    candidate: ColorRecordEntity.Type
  ): boolean {
    const state = RelationshipConstraint.domain(input, metadata, roleName);
    const baseline = state?.baseline;
    if (state === undefined || baseline === undefined) {
      return true;
    }
    const result = RelationshipConstraint.allowsState(state, baseline, candidate);
    return result;
  }

  static domain(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string
  ): RelationshipConstraintDomain | undefined {
    const graph = input.roles?.relationshipGraph === undefined
      ? undefined
      : RoleRelationshipGraphEntity.intake(input.roles.relationshipGraph);
    if (graph === undefined) {
      return undefined;
    }
    const resolution = Metadata.relationshipResolution(metadata).get(roleName);
    const selected = RelationshipConstraint.selectedRelation(graph.groups, resolution, roleName);
    if (selected === undefined) {
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
    candidate: ColorRecordEntity.Type
  ): boolean {
    const tolerance = state.tolerance;
    if (tolerance === undefined) {
      const result = RelationshipConstraint.sameColor(candidate, baseline);
      return result;
    }
    const result =
      RelationshipConstraint.within(candidate.alpha, baseline.alpha, tolerance.alpha) &&
      RelationshipConstraint.within(candidate.oklch.c, baseline.oklch.c, tolerance.chroma) &&
      RelationshipConstraint.withinHue(candidate.oklch.h, baseline.oklch.h, tolerance.hue) &&
      RelationshipConstraint.within(candidate.oklch.l, baseline.oklch.l, tolerance.lightness);
    return result;
  }

  private static sameColor(
    left: ColorRecordEntity.Type,
    right: ColorRecordEntity.Type
  ): boolean {
    const result =
      left.alpha === right.alpha &&
      left.oklch.l === right.oklch.l &&
      left.oklch.c === right.oklch.c &&
      left.oklch.h === right.oklch.h;
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
