import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import type { RelationshipToleranceEntity } from '../entities/RelationshipToleranceEntity.ts';

/** Exposes the exact resolved baseline and authored tolerance that limit a relationship target. */
export class RelationshipConstraintDomain {
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
