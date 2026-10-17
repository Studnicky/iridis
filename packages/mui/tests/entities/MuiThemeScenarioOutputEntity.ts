import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Runtime-validated shape of `state.outputs['mui:theme']`, mirroring `muiOutputSchema` in `MuiPlugin.ts`. */
export namespace MuiThemeScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-mui/tests/MuiThemeScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'config':  { 'type': 'string' },
      'palette': { 'additionalProperties': true, 'type': 'object' }
    },
    'required': ['config', 'palette'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
