import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Result shape captured by the cell-2 (context) scenario subject. */
export namespace ContextOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/tests/integration/context-output',
    'additionalProperties': false,
    'properties': {
      'loggerAcceptedDebug': { 'type': 'boolean' },
      'sharedAcrossTasks': { 'type': 'boolean' },
      'startedAtDuringRun': { 'type': 'boolean' }
    },
    'required': ['loggerAcceptedDebug', 'sharedAcrossTasks', 'startedAtDuringRun'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
