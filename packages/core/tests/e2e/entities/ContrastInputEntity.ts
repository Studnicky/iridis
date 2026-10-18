import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';

import { Validator } from '../../../src/model/Validator.ts';

/** Foreground/background hex pair fed into a contrast scenario. */
export namespace ContrastInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'bgHex': { 'type': 'string' },
      'fgHex': { 'type': 'string' }
    },
    'required': ['bgHex', 'fgHex'],
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
