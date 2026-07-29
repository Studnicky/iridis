import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

import { CSS_VARS_OUTPUT_SCHEMAS } from '../../src/constants/CssVarsOutputSchemas.ts';

export namespace CssVarsWideGamutScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-stylesheet/tests/CssVarsWideGamutScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'cssVars': {
        ...CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS,
        'required': ['darkScheme', 'forcedColors', 'full', 'map', 'rootBlock', 'scopedBlock', 'wideGamut']
      },
      'displayP3': {
        'additionalProperties': false,
        'properties': {
          'b': { 'type': 'number' },
          'g': { 'type': 'number' },
          'r': { 'type': 'number' }
        },
        'required': ['b', 'g', 'r'],
        'type': 'object'
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
