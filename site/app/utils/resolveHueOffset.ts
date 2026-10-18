import type { DerivationRelationInterfaceTypeEntity } from '../composables/entities/DerivationRelationInterfaceTypeEntity.ts';

import { buildDerivationRelations } from '../components/content/derivation/buildDerivationRelations.ts';

/** The relative hue offset (in degrees, from the parent role's own hue) a resolved relation produces. */
class ResolveHueOffsetOperation {
  static run(relation: DerivationRelationInterfaceTypeEntity.Type): number {
    const algorithm = buildDerivationRelations.resolveHueAlgorithm(relation.algorithm);
    const freeformOffsets = [relation.freeformOffset ?? 0];
    const offsets = algorithm.apply(0, { 'freeformOffsets': freeformOffsets });
    const index = ((relation.hueVariantIndex % offsets.length) + offsets.length) % offsets.length;
    const offset = offsets[index] ?? 0;
    return offset;
  }
}

export const resolveHueOffset = ResolveHueOffsetOperation.run;
