import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Raw `{l, a, b}` CIE Lab (D65) intake shape accepted by `intake:lab` before conversion to a `ColorRecord`. */
export namespace LabInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'b': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['l', 'a', 'b'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
