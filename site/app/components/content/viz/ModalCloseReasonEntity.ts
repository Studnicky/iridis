import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace ModalCloseReasonEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/modal-close-reason',
    'enum': ['programmatic', 'escape', 'backdrop'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
