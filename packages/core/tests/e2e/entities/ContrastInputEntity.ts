import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** Foreground/background hex pair fed into a contrast scenario. */
export namespace ContrastInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'bgHex': { 'type': 'string' },
      'fgHex': { 'type': 'string' }
    },
    'required': ['bgHex', 'fgHex'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
