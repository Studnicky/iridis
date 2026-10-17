import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Classifies each scenario's behavioral coverage role. */
export namespace ScenarioKindTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis/test/scenario-kind',
    'enum': ['happy', 'edge', 'unhappy'],
    'type': 'string'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
