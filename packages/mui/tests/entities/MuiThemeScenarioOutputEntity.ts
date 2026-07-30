import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

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

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
