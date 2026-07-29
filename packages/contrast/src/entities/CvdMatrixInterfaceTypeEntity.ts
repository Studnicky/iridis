import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** A CVD simulation matrix: a row-major 3×3 linear-sRGB transform for one deficiency type. */
export namespace CvdMatrixInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'matrix': {
        'items':    { 'type': 'number' },
        'maxItems': 9,
        'minItems': 9,
        'type':     'array'
      },
      'name': { 'enum': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'], 'type': 'string' }
    },
    'required': ['matrix', 'name'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
