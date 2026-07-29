import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** One WCAG 2.1 contrast-pair enforcement result: before/after ratios against the required minimum. */
export namespace WcagPairResultInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'after':      { 'type': 'number' },
      'algorithm':  { 'enum': ['wcag21', 'apca'], 'type': 'string' },
      'background': { 'type': 'string' },
      'before':     { 'type': 'number' },
      'foreground': { 'type': 'string' },
      'pass':       { 'type': 'boolean' },
      'required':   { 'type': 'number' }
    },
    'required': ['after', 'algorithm', 'background', 'before', 'foreground', 'pass', 'required'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
