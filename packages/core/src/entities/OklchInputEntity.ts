import type { InferType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Raw `{l, c, h, a?}` OKLCH intake shape accepted by `intake:oklch` before conversion to a `ColorRecord`. */
export namespace OklchInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/oklch-input',
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'c': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['l', 'c', 'h'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
