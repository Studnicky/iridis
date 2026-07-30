import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis';

/** Tailwind `theme.colors` shape: role name to hex string, or shade root to a `{shade: hex}` scale. */
export namespace ColorsShapeRecordEntity {
  export const Schema = {
    'additionalProperties': {
      'oneOf': [
        { 'type': 'string' },
        {
          'additionalProperties': { 'type': 'string' },
          'type': 'object'
        }
      ]
    },
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
