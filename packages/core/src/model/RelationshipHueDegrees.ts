import type { RelationshipGraphShape } from './RelationshipGraphShape.ts';

/** Resolves authored hue-offset degrees from a direct value or a named mode variant. */
export class RelationshipHueDegrees {
  static modeId(
    group: RelationshipGraphShape.GroupInterface,
    relationship: RelationshipGraphShape.GroupInterface['relationships'][number]
  ): string {
    const result = relationship.operation === 'hue-offset'
      ? relationship.modeId ?? group.defaultMode
      : group.defaultMode;
    return result;
  }

  static resolve(
    group: RelationshipGraphShape.GroupInterface,
    relationship: Extract<RelationshipGraphShape.GroupInterface['relationships'][number], { readonly 'operation': 'hue-offset' }>
  ): number {
    if (relationship.degrees !== undefined) {
      return relationship.degrees;
    }
    const modeId = RelationshipHueDegrees.modeId(group, relationship);
    const mode = group.modes.find((candidate) => {
      const result = candidate.id === modeId;
      return result;
    });
    const variant = mode?.hueOffsets.find((candidate) => {
      const result = candidate.variantId === relationship.variantId;
      return result;
    });
    if (variant === undefined) {
      throw new TypeError(`hue-offset relationship ${relationship.id} has no resolved hue variant`);
    }
    return variant.degrees;
  }
}
