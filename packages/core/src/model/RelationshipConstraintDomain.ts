import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import type { RelationshipToleranceEntity } from '../entities/RelationshipToleranceEntity.ts';
import type { RoleRelationshipEntity } from '../entities/RoleRelationshipEntity.ts';

/** Exposes authored relationship data and its optional exact runtime baseline. */
export class RelationshipConstraintDomain {
  readonly baseline: ColorRecordEntity.Type | undefined;
  readonly groupId: string;
  readonly hueDegrees: number | undefined;
  readonly modeId: string;
  readonly relationId: string;
  readonly relationship: RoleRelationshipEntity.Type;
  readonly sources: readonly string[];
  readonly tolerance: RelationshipToleranceEntity.Type | undefined;

  constructor(options: Readonly<{
    'baseline': ColorRecordEntity.Type | undefined;
    'groupId': string;
    'hueDegrees': number | undefined;
    'modeId': string;
    'relationship': RoleRelationshipEntity.Type;
    'sources': readonly string[];
    'tolerance': RelationshipToleranceEntity.Type | undefined;
  }>) {
    this.baseline = options.baseline;
    this.groupId = options.groupId;
    this.hueDegrees = options.hueDegrees;
    this.modeId = options.modeId;
    this.relationId = options.relationship.id;
    this.relationship = options.relationship;
    this.sources = options.sources;
    this.tolerance = options.tolerance;
  }

  static coordinateRange(options: Readonly<{
    'baseline': readonly [number, number];
    'envelope': readonly [number, number];
    'maximum': number;
    'minimum': number;
    'tolerance': number | undefined;
  }>): readonly [number, number] {
    const tolerance = options.tolerance ?? 0;
    const lower = Math.max(options.minimum, options.envelope[0], Math.min(options.baseline[0], options.baseline[1]) - tolerance);
    const upper = Math.min(options.maximum, options.envelope[1], Math.max(options.baseline[0], options.baseline[1]) + tolerance);
    if (lower <= upper) {
      const result: readonly [number, number] = [lower, upper];
      return result;
    }
    const edge = upper < options.envelope[0] ? options.envelope[0] : options.envelope[1];
    const result: readonly [number, number] = [edge, edge];
    return result;
  }

  get operation(): RoleRelationshipEntity.Type['operation'] {
    const result = this.relationship.operation;
    return result;
  }
}
