import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** Computed WCAG 2.1 contrast ratio. */
export namespace ContrastOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'ratio': { 'type': 'number' }
    },
    'required': ['ratio'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
