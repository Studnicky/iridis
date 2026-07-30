import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Raw `{r, g, b, a?}` intake shape accepted by `intake:rgb` before conversion to a `ColorRecord`. */
export namespace RgbInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'b': { 'type': 'number' },
      'g': { 'type': 'number' },
      'r': { 'type': 'number' }
    },
    'required': ['r', 'g', 'b'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
