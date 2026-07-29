import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Soft color metadata: role, intent, weight. */
export namespace ColorHintsInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'intent': {
        'enum': [
          'text',
          'background',
          'accent',
          'muted',
          'critical',
          'positive',
          'link',
          'button',
          'onAccent',
          'onButton'
        ]
      },
      'role':   { 'type': 'string' },
      'weight': { 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
