import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Input shape for the cell-4 (error-paths) scenario subject. */
export namespace ErrorPathInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'message': { 'type': 'string' } },
    'required': ['message'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
