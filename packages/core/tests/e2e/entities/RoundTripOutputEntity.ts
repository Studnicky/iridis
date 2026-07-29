import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** OKLCH round-trip result: lightness, chroma, and hue recovered from RGB. */
export namespace RoundTripOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'backC': { 'type': 'number' },
      'backH': { 'type': 'number' },
      'backL': { 'type': 'number' }
    },
    'required': ['backC', 'backH', 'backL'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
