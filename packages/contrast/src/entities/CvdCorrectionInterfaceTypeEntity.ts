import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** One CVD auto-correction record: which failing deficiency types were cleared for a pair and which remain. */
export namespace CvdCorrectionInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'background':        { 'type': 'string' },
      'cvdTypesFixed':     { 'items': { 'type': 'string' }, 'type': 'array' },
      'cvdTypesRemaining': { 'items': { 'type': 'string' }, 'type': 'array' },
      'foreground':        { 'type': 'string' }
    },
    'required': ['background', 'cvdTypesFixed', 'cvdTypesRemaining', 'foreground'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
