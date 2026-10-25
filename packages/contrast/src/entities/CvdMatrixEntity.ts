import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** A CVD simulation matrix: a row-major 3×3 linear-sRGB transform for one deficiency type. */
export namespace CvdMatrixEntity {
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

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
