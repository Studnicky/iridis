import type { InferType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** sRGB color: red, green, blue channels. */
export namespace RgbInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/rgb',
    'additionalProperties': false,
    'properties': {
      'b': { 'type': 'number' },
      'g': { 'type': 'number' },
      'r': { 'type': 'number' }
    },
    'required': ['b', 'g', 'r'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
