import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace InvalidInputOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-shadcn/tests/InvalidInputOutput',
    'additionalProperties': false,
    'properties': { 'themeWritten': { 'type': 'boolean' } },
    'required': ['themeWritten'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
