import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Raw `{l, a, b}` CIE Lab (D65) intake shape accepted by `intake:lab` before conversion to a `ColorRecord`. */
export namespace LabInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'b': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['l', 'a', 'b'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
