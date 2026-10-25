import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Authored hue variants available to one relationship group. */
export namespace HarmonyModeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/harmony-mode',
    'additionalProperties': false,
    'properties': {
      'hueOffsets': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'degrees': { 'maximum': 360, 'minimum': -360, 'type': 'number' },
            'variantId': { 'minLength': 1, 'type': 'string' }
          },
          'required': ['degrees', 'variantId'],
          'type': 'object'
        },
        'minItems': 1,
        'type': 'array'
      },
      'id': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['hueOffsets', 'id'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
