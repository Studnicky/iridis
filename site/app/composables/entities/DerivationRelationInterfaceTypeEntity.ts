import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace DerivationRelationInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/derivation-relation',
    'additionalProperties': false,
    'properties': {
      'algorithm': {
        'enum': ['analogous', 'complementary', 'compound', 'freeform', 'monochromatic', 'split-complementary', 'tetradic', 'triadic'],
        'type': 'string'
      },
      'freeformOffset': { 'type': 'number' },
      'hueVariantIndex': { 'type': 'integer' }
    },
    'required': ['algorithm', 'hueVariantIndex'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
