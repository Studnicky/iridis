import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace CvdModeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/cvd-mode',
    'enum': ['warn', 'nudge', 'enforce'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const defaultValue = intake('nudge');
}
