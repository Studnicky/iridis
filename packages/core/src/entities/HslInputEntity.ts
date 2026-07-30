import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Raw `{h, s, l, a?}` intake shape accepted by `intake:hsl` before conversion to a `ColorRecord`. */
export namespace HslInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' },
      's': { 'type': 'number' }
    },
    'required': ['h', 's', 'l'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
