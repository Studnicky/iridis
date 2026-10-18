import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Input shape for the cell-2 (context) scenario subject — carries no fields. */
export namespace ContextInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/context-input',
    'additionalProperties': false,
    'properties': {},
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
