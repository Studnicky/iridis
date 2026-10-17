import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Construction options for {@link import('../ClockBinding.ts').ClockBinding.create}. */
export namespace ClockBindingOptionsInterfaceTypeEntity {
  export const Schema = {
    '$id':                 'https://studnicky.dev/iridis-pulse/ClockBindingOptions',
    'additionalProperties': false,
    'properties': {
      'durationMs': { 'type': 'number' },
      'mode':       { 'enum': ['real', 'virtual'] }
    },
    'required': ['durationMs', 'mode'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate: ReturnType<typeof EntityCompiler.compile<Type>> = EntityCompiler.compile<Type>(Schema);
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
