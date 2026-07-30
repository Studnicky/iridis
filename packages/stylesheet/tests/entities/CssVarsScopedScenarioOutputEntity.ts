import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { CSS_VARS_OUTPUT_SCHEMAS } from '../../src/constants/CssVarsOutputSchemas.ts';

export namespace CssVarsScopedScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-stylesheet/tests/CssVarsScopedScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'scoped': {
        ...CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS_SCOPED,
        'required': ['blocks', 'full', 'wideGamut']
      }
    },
    'required': ['scoped'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
