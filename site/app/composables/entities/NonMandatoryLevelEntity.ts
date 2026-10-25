import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace NonMandatoryLevelEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/non-mandatory-level',
    'enum': ['AA', 'AAA'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const defaultValue = intake('AA');
}
