import type { JSONSchema7Type } from 'json-schema';

import type { InputEntity } from '../entities/InputEntity.ts';

import { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import { RelationshipResolutionEntity } from '../entities/RelationshipResolutionEntity.ts';
import { RelationshipToleranceEntity } from '../entities/RelationshipToleranceEntity.ts';
import { Metadata } from '../types/metadata.ts';

class RelationshipConstraintState {
  readonly baseline: ColorRecordEntity.Type;
  readonly relationId: string;
  readonly tolerance: RelationshipToleranceEntity.Type | undefined;

  constructor(
    baseline: ColorRecordEntity.Type,
    relationId: string,
    tolerance: RelationshipToleranceEntity.Type | undefined
  ) {
    this.baseline = baseline;
    this.relationId = relationId;
    this.tolerance = tolerance;
  }
}

/** Reads authored graph tolerances against their exact relationship-resolution baselines. */
export class RelationshipConstraint {
  static allows(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string,
    candidate: ColorRecordEntity.Type
  ): boolean {
    const state = RelationshipConstraint.state(input, metadata, roleName);
    if (state === undefined) {
      return true;
    }
    const result = RelationshipConstraint.allowsState(state, candidate);
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
      const state = RelationshipConstraint.state(input, metadata, roleName);
      if (state !== undefined) {
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
    const state = RelationshipConstraint.state(input, metadata, roleName);
    if (state?.tolerance === undefined) {
      return;
    }
    const resolutions = Metadata.relationshipResolution(metadata);
    const resolution = resolutions.get(roleName);
    if (resolution === undefined) {
      return;
    }
    const deviation = RelationshipToleranceEntity.create({
      'alpha': Math.abs(candidate.alpha - state.baseline.alpha),
      'chroma': Math.abs(candidate.oklch.c - state.baseline.oklch.c),
      'hue': RelationshipConstraint.hueDifference(candidate.oklch.h, state.baseline.oklch.h),
      'lightness': Math.abs(candidate.oklch.l - state.baseline.oklch.l)
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
    const result = RelationshipConstraint.state(input, metadata, roleName) !== undefined;
    return result;
  }

  private static allowsState(
    state: RelationshipConstraintState,
    candidate: ColorRecordEntity.Type
  ): boolean {
    const tolerance = state.tolerance;
    if (tolerance === undefined) {
      const result = RelationshipConstraint.sameColor(candidate, state.baseline);
      return result;
    }
    const result =
      RelationshipConstraint.within(candidate.alpha, state.baseline.alpha, tolerance.alpha) &&
      RelationshipConstraint.within(candidate.oklch.c, state.baseline.oklch.c, tolerance.chroma) &&
      RelationshipConstraint.withinHue(candidate.oklch.h, state.baseline.oklch.h, tolerance.hue) &&
      RelationshipConstraint.within(candidate.oklch.l, state.baseline.oklch.l, tolerance.lightness);
    return result;
  }

  private static state(
    input: InputEntity.Type,
    metadata: Record<string, JSONSchema7Type>,
    roleName: string
  ): RelationshipConstraintState | undefined {
    const resolution = Metadata.relationshipResolution(metadata).get(roleName);
    const baseline = resolution?.after;
    const graph = input.roles?.relationshipGraph;
    if (resolution === undefined || baseline === undefined || graph === undefined) {
      return undefined;
    }
    const group = graph.groups.find((candidate) => {
      const result = candidate.id === resolution.groupId;
      return result;
    });
    const relationship = group?.relationships.find((candidate) => {
      const result = candidate.id === resolution.relationshipId;
      return result;
    });
    if (relationship === undefined) {
      return undefined;
    }
    const tolerance = relationship.relaxability === 'tolerant'
      ? RelationshipToleranceEntity.intake(relationship.tolerance)
      : undefined;
    const normalizedBaseline = ColorRecordEntity.intake(baseline);
    const result = new RelationshipConstraintState(
      normalizedBaseline,
      relationship.id,
      tolerance
    );
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
