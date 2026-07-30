import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** One of the `CliConfigEntity` boolean flags that gates loading an optional plugin package. */
export namespace FlagKeyEntity {
  export const Schema = {
    'enum': [
      'enableCapacitor',
      'enableContrast',
      'enableImage',
      'enableRdf',
      'enableStylesheet',
      'enableTailwind',
      'enableVscode'
    ],
    'type': 'string'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
