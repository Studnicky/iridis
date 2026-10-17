import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Raw `{h, s, l, a?}` intake shape accepted by `intake:hsl` before conversion to a `ColorRecord`. */
export namespace HslInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' },
      's': { 'type': 'number' }
    },
    'required': ['h', 's', 'l'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
