import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Result shape captured by the cell-3 (edge-inputs) scenario subject. */
export namespace EdgeInputsOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/edge-inputs-output',
    'additionalProperties': false,
    'properties': {
      'colorsLength': { 'type': 'number' },
      'rolesCount':   { 'type': 'number' },
      'stubKeyCount': { 'type': 'number' }
    },
    'required': ['colorsLength', 'rolesCount', 'stubKeyCount'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
