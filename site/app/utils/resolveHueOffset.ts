import type { RoleRelationDerivationType } from '../composables/types/colorDerivation.ts';

import { selectHueAlgorithm } from './selectHueAlgorithm.ts';

/** The relative hue offset (in degrees, from the parent role's own hue) a resolved relation produces. */
export function resolveHueOffset(relation: RoleRelationDerivationType): number {
  if (relation.hueAlgorithm === 'freeform') {return relation.freeformOffset ?? 0;}
  const offsets = selectHueAlgorithm(relation.hueAlgorithm, 0);
  const index = ((relation.hueVariantIndex % offsets.length) + offsets.length) % offsets.length;
  return offsets[index] ?? 0;
}
