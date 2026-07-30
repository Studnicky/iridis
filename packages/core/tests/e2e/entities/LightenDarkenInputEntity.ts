import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** Lighten/darken scenario input: source hex, operation, and delta amount. */
export namespace LightenDarkenInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'amount': { 'type': 'number' },
      'hex':    { 'type': 'string' },
      'op':     { 'enum': ['lighten', 'darken'], 'type': 'string' }
    },
    'required': ['amount', 'hex', 'op'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
