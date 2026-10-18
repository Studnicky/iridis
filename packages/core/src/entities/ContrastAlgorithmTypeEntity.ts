import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Supported contrast-calculation algorithms. */
export namespace ContrastAlgorithmTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-algorithm',
    'enum': ['wcag21', 'apca'],
    'type': 'string'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
