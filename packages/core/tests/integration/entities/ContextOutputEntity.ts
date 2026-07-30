import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Result shape captured by the cell-2 (context) scenario subject. */
export namespace ContextOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'engineIsExact': { 'type': 'boolean' } },
    'required': ['engineIsExact'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
