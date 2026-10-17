import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';

import { Validator } from '../../../src/model/Validator.ts';

/** Lighten/darken scenario input: source hex, operation, and delta amount. */
export namespace LightenDarkenInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'amount': { 'type': 'number' },
      'hex':    { 'type': 'string' },
      'op':     { 'enum': ['lighten', 'darken'], 'type': 'string' }
    },
    'required': ['amount', 'hex', 'op'],
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
