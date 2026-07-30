import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Result shape captured by the cell-1 (state-flow) scenario subject. */
export namespace StateFlowOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'colorsLength':  { 'type': 'number' },
      'firstColorHex': { 'type': 'string' },
      'hasPrimary':    { 'type': 'boolean' },
      'metaCategory':  { 'type': 'string' },
      'metaVersion':   { 'type': 'number' },
      'primaryHex':    { 'type': 'string' },
      'stubVarValue':  { 'type': 'string' }
    },
    'required': ['colorsLength', 'firstColorHex', 'hasPrimary', 'primaryHex', 'stubVarValue'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
