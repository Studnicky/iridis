import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** One foreground/background contrast requirement, with an optional algorithm override. */
export namespace ContrastPairInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'algorithm':  { 'enum': ['wcag21', 'apca'] },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'minRatio':   { 'type': 'number' }
    },
    'required': ['background', 'foreground', 'minRatio'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
