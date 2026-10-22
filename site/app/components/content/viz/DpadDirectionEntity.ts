import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace DpadDirectionEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/dpad-direction',
    'enum': ['up', 'down', 'left', 'right'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
