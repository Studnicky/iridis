import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Raw `{l, c, h, a?}` OKLCH intake shape accepted by `intake:oklch` before conversion to a `ColorRecord`. */
export namespace OklchInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'c': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['l', 'c', 'h'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
