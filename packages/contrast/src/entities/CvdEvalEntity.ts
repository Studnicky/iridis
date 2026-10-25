import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** Result of evaluating one foreground/background pair against a single CVD matrix. */
export namespace CvdEvalEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'belowFloor':       { 'type': 'boolean' },
      'cvdType':          { 'enum': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'], 'type': 'string' },
      'drop':             { 'type': 'number' },
      'exceedsDrop':      { 'type': 'boolean' },
      'fail':             { 'type': 'boolean' },
      'originalContrast': { 'type': 'number' },
      'simContrast':      { 'type': 'number' }
    },
    'required': ['belowFloor', 'cvdType', 'drop', 'exceedsDrop', 'fail', 'originalContrast', 'simContrast'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
