import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { CSS_VARS_OUTPUT_SCHEMAS } from '../../src/constants/CssVarsOutputSchemas.ts';

export namespace CssVarsScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-stylesheet/tests/CssVarsScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'cssVars': {
        ...CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS,
        'required': ['darkScheme', 'forcedColors', 'full', 'map', 'rootBlock', 'scopedBlock', 'wideGamut']
      }
    },
    'required': ['cssVars'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
