import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Shape of a single variant configuration entry (read by derive:variant). */
export namespace VariantConfigEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/variant-config',
    'additionalProperties': false,
    'properties': {
      'invertLightness': { 'type': 'boolean' },
      'lightnessOffset': { 'type': 'number' },
      'lightnessTarget': { 'type': 'number' },
      'name':            { 'type': 'string' }
    },
    'required': ['invertLightness', 'name'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
