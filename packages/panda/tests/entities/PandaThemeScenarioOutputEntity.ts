import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

export namespace PandaThemeScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-panda/tests/PandaThemeScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'colors':      { 'additionalProperties': true, 'type': 'object' },
      'pandaConfig': { 'type': 'string' },
      'unoConfig':   { 'type': 'string' }
    },
    'required': ['colors', 'pandaConfig', 'unoConfig'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
