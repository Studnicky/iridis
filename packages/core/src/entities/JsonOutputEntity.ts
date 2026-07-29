import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Flattened `{colors, roles, variants}` hex-string output written by `emit:json` to `state.outputs['core:json']`. */
export namespace JsonOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'colors': {
        'items': { 'type': 'string' },
        'type':  'array'
      },
      'roles': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'variants': {
        'additionalProperties': {
          'additionalProperties': { 'type': 'string' },
          'type': 'object'
        },
        'type': 'object'
      }
    },
    'required': ['colors', 'roles', 'variants'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
