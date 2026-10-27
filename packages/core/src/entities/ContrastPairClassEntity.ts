import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** What a contrast pair protects: readable text, or a non-text mark (graphic or interface boundary) held to the non-text floor. */
export namespace ContrastPairClassEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-pair-class',
    'enum': [
      'text',
      'non-text',
      'ui'
    ],
    'type': 'string'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
