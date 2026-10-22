import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** One validation failure: a human-readable message and its JSON-path location. */
export namespace ValidationErrorEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/validation-error',
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'path':    { 'type': 'string' }
    },
    'required': ['message', 'path'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
