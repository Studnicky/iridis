import type { FromSchema, JsonValueType } from '@studnicky/types';

import { JsonTology } from '@studnicky/json-tology';

/** Construction options for {@link import('../ClockBinding.ts').ClockBinding.create}. */
export namespace ClockBindingOptionsInterfaceTypeEntity {
  export const Schema = {
    '$id':                 'https://studnicky.dev/iridis-pulse/ClockBindingOptions',
    'additionalProperties': false,
    'properties': {
      'durationMs': { 'type': 'number' },
      'mode':       { 'enum': ['real', 'virtual'] }
    },
    'required': ['durationMs', 'mode'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = JsonTology.is(Schema, value);
    return result;
  };
}
