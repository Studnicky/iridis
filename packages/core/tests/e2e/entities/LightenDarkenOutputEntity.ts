import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** Lighten/darken scenario output: input and output hex plus their OKLCH L values. */
export namespace LightenDarkenOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'inputHex':  { 'type': 'string' },
      'inputL':    { 'type': 'number' },
      'outputHex': { 'type': 'string' },
      'outputL':   { 'type': 'number' }
    },
    'required': ['inputHex', 'inputL', 'outputHex', 'outputL'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
