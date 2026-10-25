import type { PaletteStateInterface } from '../interfaces/PaletteStateInterface.ts';

/** Resolves authored hue-offset degrees from a direct value or a named mode variant. */
export class RelationshipHueDegrees {
  static resolve(
    group: NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number],
    relationship: Extract<NonNullable<NonNullable<PaletteStateInterface['input']['roles']>['relationshipGraph']>['groups'][number]['relationships'][number], { readonly 'operation': 'hue-offset' }>
  ): number {
    if (relationship.degrees !== undefined) {
      return relationship.degrees;
    }
    const modeId = relationship.modeId ?? group.defaultMode;
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
