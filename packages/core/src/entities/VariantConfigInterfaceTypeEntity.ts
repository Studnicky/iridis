import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Shape of a single variant configuration entry (read by derive:variant). */
export namespace VariantConfigInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'invertLightness': { 'type': 'boolean' },
      'lightnessOffset': { 'type': 'number' },
      'lightnessTarget': { 'type': 'number' },
      'name':            { 'type': 'string' }
    },
    'required': ['invertLightness', 'name'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
