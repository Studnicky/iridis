import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Input shape for the cell-3 (edge-inputs) scenario subject. */
export namespace EdgeInputsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'mode': { 'enum': ['empty', 'single', 'multi-index'], 'type': 'string' }
    },
    'required': ['mode'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
