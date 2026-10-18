import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Result shape for the cell-4 (error-paths) scenario subject — carries no fields. */
export namespace ErrorPathOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/error-path-output',
    'additionalProperties': false,
    'properties': {},
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
