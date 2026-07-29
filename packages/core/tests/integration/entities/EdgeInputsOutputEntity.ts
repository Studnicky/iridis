import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Result shape captured by the cell-3 (edge-inputs) scenario subject. */
export namespace EdgeInputsOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'colorsLength': { 'type': 'number' },
      'rolesCount':   { 'type': 'number' },
      'stubKeyCount': { 'type': 'number' }
    },
    'required': ['colorsLength', 'rolesCount', 'stubKeyCount'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
