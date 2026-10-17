import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Input shape for the cell-3 (edge-inputs) scenario subject. */
export namespace EdgeInputsInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/edge-inputs-input',
    'additionalProperties': false,
    'properties': {
      'mode': { 'enum': ['empty', 'single', 'multi-index'], 'type': 'string' }
    },
    'required': ['mode'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
