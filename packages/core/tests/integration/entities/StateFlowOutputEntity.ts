import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Result shape captured by the cell-1 (state-flow) scenario subject. */
export namespace StateFlowOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/state-flow-output',
    'additionalProperties': false,
    'properties': {
      'colorsLength':  { 'type': 'number' },
      'firstColorHex': { 'type': 'string' },
      'hasPrimary':    { 'type': 'boolean' },
      'metaCategory':  { 'type': 'string' },
      'metaVersion':   { 'type': 'number' },
      'primaryHex':    { 'type': 'string' },
      'stubVarValue':  { 'type': 'string' }
    },
    'required': ['colorsLength', 'firstColorHex', 'hasPrimary', 'primaryHex', 'stubVarValue'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
