import { DerivationRelationEntity } from '../composables/entities/DerivationRelationEntity.ts';

/**
 * Every relation this codebase resolves goes through this function, whether
 * or not the user has customized it — so there is exactly one path from
 * picker to pipeline, never a second, silent fallback that can drift out of
 * sync with what the UI shows. An unset relation defaults to 'freeform'
 * seeded with the schema's own hueOffset, reproducing today's fixed output
 * exactly until the user changes it.
 */
class EffectiveRelationOperation {
  static run({ relation, schemaHueOffset }: {
    readonly 'relation': DerivationRelationEntity.Type | undefined;
    readonly 'schemaHueOffset': number | undefined;
  }): DerivationRelationEntity.Type {
    if (relation !== undefined) {return relation;}
    const freeformRelation = DerivationRelationEntity.create({
      'algorithm': 'freeform',
      'freeformOffset': schemaHueOffset ?? 0,
      'hueVariantIndex': 0
    });
    return freeformRelation;
  }
}

export const effectiveRelation = EffectiveRelationOperation.run;
