import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** sRGB color: red, green, blue channels. */
export namespace RgbInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'b': { 'type': 'number' },
      'g': { 'type': 'number' },
      'r': { 'type': 'number' }
    },
    'required': ['b', 'g', 'r'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
