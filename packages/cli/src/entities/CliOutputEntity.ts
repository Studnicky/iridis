import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

export namespace CliOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-cli/CliOutput',
    'properties': {
      'directory': { 'type': 'string' },
      'files': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      }
    },
    'required': ['directory', 'files'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType | Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
