import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** Terminally unsatisfied semantic pair with its deterministic compliance blocker. */
export namespace ComplianceBlockedPairEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'actualTrichromat': { 'type': 'number' },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'reason': { 'enum': ['stated-both', 'solver-exhausted', 'relation-tolerance'], 'type': 'string' },
      'requiredTrichromat': { 'type': 'number' },
      'target': { 'type': 'string' }
    },
    'required': ['actualTrichromat', 'background', 'foreground', 'reason', 'requiredTrichromat', 'target'],
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
