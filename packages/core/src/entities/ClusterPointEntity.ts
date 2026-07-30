import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** OKLab-derived clustering point: lightness plus two chroma axes. */
export namespace ClusterPointEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'a': { 'type': 'number' },
      'b': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['a', 'b', 'l'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
