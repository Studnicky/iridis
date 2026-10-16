import {
  type FromSchema,
  JsonObject,
  type JsonValueType
} from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** One foreground/background contrast requirement, with an optional algorithm override. */
export namespace ContrastPairInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'algorithm': { 'enum': ['wcag21', 'apca'] },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'maxRatio': { 'maximum': 21, 'minimum': 1, 'type': 'number' },
      'minRatio': { 'maximum': 21, 'minimum': 1, 'type': 'number' }
    },
    'required': ['background', 'foreground', 'minRatio'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    if (!result.valid || !JsonObject.is(value)) {
      return false;
    }

    const maximumContrastRatio = value.maxRatio;
    const minimumContrastRatio = value.minRatio;
    return (
      typeof maximumContrastRatio !== 'number' ||
      (typeof minimumContrastRatio === 'number' &&
        maximumContrastRatio >= minimumContrastRatio)
    );
  };
}
