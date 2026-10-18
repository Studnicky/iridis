import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Runtime-validated result of annotation and optional serialization. */
export namespace RdfPluginAnnotateScenarioEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'graph': { 'type': 'string' },
      'resolvedRoleCount': { 'type': 'number' },
      'serialized': { 'type': 'string' }
    },
    'required': ['graph', 'resolvedRoleCount'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
