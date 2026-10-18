import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';

import { Validator } from '../../../src/model/Validator.ts';

/** Lighten/darken scenario output: input and output hex plus their OKLCH L values. */
export namespace LightenDarkenOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'inputHex':  { 'type': 'string' },
      'inputL':    { 'type': 'number' },
      'outputHex': { 'type': 'string' },
      'outputL':   { 'type': 'number' }
    },
    'required': ['inputHex', 'inputL', 'outputHex', 'outputL'],
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
