import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Scenario classification for a row in the test matrix. */
export namespace ScenarioClassificationEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'classification': { 'enum': ['happy', 'edge', 'unhappy'] }
    },
    'required': ['classification'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
