import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace DpadActionEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/dpad-action',
    'enum': [
      'zoom-in', 'pan-up', 'zoom-out',
      'pan-left', 'centre', 'pan-right',
      'expand', 'close', 'pan-down', 'fit'
    ],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
