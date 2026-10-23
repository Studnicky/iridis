import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { ContrastLimitingBoundEntity } from './ContrastLimitingBoundEntity.ts';

/** Measured best-achievable evidence for one constrained contrast pair. */
export namespace ContrastFeasibilityProofEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'bestActual': { 'type': 'number' },
      'limitingBounds': {
        'items': ContrastLimitingBoundEntity.Schema,
        'type': 'array'
      },
      'missingLuminance': { 'minimum': 0, 'type': 'number' },
      'required': { 'type': 'number' },
      'shortfall': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['bestActual', 'limitingBounds', 'missingLuminance', 'required', 'shortfall'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const validation = new Validator().validate(Schema, value);
    const result = validation.errors.length === 0;
    return result;
  };
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
