import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Validated scenario label for scenario-matrix rows. */
export namespace ScenarioKindTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/test/stylesheet-scenario-kind',
    'enum': ['happy', 'edge', 'unhappy'],
    'type': 'string'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
