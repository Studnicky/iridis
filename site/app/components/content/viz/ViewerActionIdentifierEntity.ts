import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace ViewerActionIdentifierEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/viewer-action-identifier',
    'enum': ['zoom-in', 'zoom-out', 'centre', 'fit', 'close', 'expand', 'fullscreen', 'clear'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
