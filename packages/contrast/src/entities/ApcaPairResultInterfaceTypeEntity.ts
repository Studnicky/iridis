import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** One APCA (WCAG 3 draft) contrast-pair enforcement result: before/after Lc against the required target. */
export namespace ApcaPairResultInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'afterLc':    { 'type': 'number' },
      'algorithm':  { 'enum': ['apca'], 'type': 'string' },
      'background': { 'type': 'string' },
      'beforeLc':   { 'type': 'number' },
      'foreground': { 'type': 'string' },
      'pass':       { 'type': 'boolean' },
      'requiredLc': { 'type': 'number' }
    },
    'required': ['afterLc', 'algorithm', 'background', 'beforeLc', 'foreground', 'pass', 'requiredLc'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
