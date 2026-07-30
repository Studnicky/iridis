import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** HSL conversion result. Hue 0-360, saturation/lightness 0-1, alpha 0-1. */
export namespace HslResultInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'alpha': { 'type': 'number' },
      'h':     { 'type': 'number' },
      'l':     { 'type': 'number' },
      's':     { 'type': 'number' }
    },
    'required': ['alpha', 'h', 'l', 's'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
