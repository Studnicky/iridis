import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** OKLCH color: lightness, chroma, hue. */
export namespace OklchInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'c': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['c', 'h', 'l'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
