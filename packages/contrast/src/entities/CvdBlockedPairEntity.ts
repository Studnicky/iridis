import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** A CVD pair that remains unresolved because both semantic endpoints are stated. */
export namespace CvdBlockedPairEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'background': { 'type': 'string' },
      'cvdTypes': { 'items': { 'type': 'string' }, 'type': 'array' },
      'foreground': { 'type': 'string' },
      'reason': { 'enum': ['stated-both', 'solver-exhausted', 'solver-infeasible'], 'type': 'string' }
    },
    'required': ['background', 'cvdTypes', 'foreground', 'reason'],
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
