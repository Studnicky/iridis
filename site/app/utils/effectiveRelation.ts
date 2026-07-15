import type { RoleRelationDerivationType } from '../composables/types/colorDerivation.ts';

/**
 * Every relation this codebase resolves goes through this function, whether
 * or not the user has customized it — so there is exactly one path from
 * picker to pipeline, never a second, silent fallback that can drift out of
 * sync with what the UI shows. An unset relation defaults to 'freeform'
 * seeded with the schema's own hueOffset, reproducing today's fixed output
 * exactly until the user changes it.
 */
export function effectiveRelation(
  schemaHueOffset: number | undefined,
  relation: RoleRelationDerivationType | undefined
): RoleRelationDerivationType {
  if (relation !== undefined) {return relation;}
  return { 'freeformOffset': schemaHueOffset ?? 0, 'hueAlgorithm': 'freeform', 'hueVariantIndex': 0 };
}
