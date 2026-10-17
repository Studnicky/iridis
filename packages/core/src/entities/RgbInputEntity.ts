import type { InferType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Raw `{r, g, b, a?}` intake shape accepted by `intake:rgb` before conversion to a `ColorRecord`. */
export namespace RgbInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/rgb-input',
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'b': { 'type': 'number' },
      'g': { 'type': 'number' },
      'r': { 'type': 'number' }
    },
    'required': ['r', 'g', 'b'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
