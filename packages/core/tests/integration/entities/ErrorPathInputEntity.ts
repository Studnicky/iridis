import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Input shape for the cell-4 (error-paths) scenario subject. */
export namespace ErrorPathInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/error-path-input',
    'additionalProperties': false,
    'properties': { 'message': { 'type': 'string' } },
    'required': ['message'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
