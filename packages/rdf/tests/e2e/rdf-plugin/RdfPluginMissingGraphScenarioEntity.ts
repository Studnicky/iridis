import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Runtime-validated result for serializer execution without an annotation graph. */
export namespace RdfPluginMissingGraphScenarioEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'reasoningGraphWritten': { 'type': 'boolean' },
      'serializedOutputWritten': { 'type': 'boolean' }
    },
    'required': ['reasoningGraphWritten', 'serializedOutputWritten'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
