import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Input shape for the cell-2 (context) scenario subject — carries no fields. */
export namespace ContextInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {},
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
