import type { FromSchema, JsonValueType } from '@studnicky/types';

import { JsonTology } from '@studnicky/json-tology';

/**
 * Construction options for {@link import('../ValueBinding.ts').ValueBinding.create}.
 * `clamp` (whether out-of-range input clamps to [0, 1]; defaults to `true`
 * when omitted) is the only optional field.
 */
export namespace ValueBindingOptionsInterfaceTypeEntity {
  export const Schema = {
    '$id':                 'https://studnicky.dev/iridis-pulse/ValueBindingOptions',
    'additionalProperties': false,
    'properties': {
      'clamp': { 'type': 'boolean' },
      'max':   { 'type': 'number' },
      'min':   { 'type': 'number' }
    },
    'required': ['max', 'min'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = JsonTology.is(Schema, value);
    return result;
  };
}
