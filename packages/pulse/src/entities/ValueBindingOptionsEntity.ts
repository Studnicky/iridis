import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Construction options for {@link import('../ValueBinding.ts').ValueBinding.create}.
 * `clamp` (whether out-of-range input clamps to [0, 1]; defaults to `true`
 * when omitted) is the only optional field.
 */
export namespace ValueBindingOptionsEntity {
  export const Schema = {
    '$id':                 'https://studnicky.dev/iridis-pulse/ValueBindingOptions',
    'additionalProperties': false,
    'properties': {
      'clamp':   { 'type': 'boolean' },
      'maximum': { 'type': 'number' },
      'minimum': { 'type': 'number' }
    },
    'required': ['maximum', 'minimum'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate: ReturnType<typeof EntityCompiler.compile<Type>> = EntityCompiler.compile<Type>(Schema);
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
