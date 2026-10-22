import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { CvdEvalInterfaceTypeEntity } from './CvdEvalInterfaceTypeEntity.ts';

/** Terminal selected-standard measurement for one semantic contrast pair. */
export namespace CompliancePairInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'actualTrichromat': { 'type': 'number' },
      'adjustedRole': { 'type': 'string' },
      'background': { 'type': 'string' },
      'cvd': {
        'items': CvdEvalInterfaceTypeEntity.Schema,
        'type': 'array'
      },
      'disposition': { 'enum': ['not-needed', 'adjusted-foreground', 'adjusted-background', 'blocked-stated', 'unresolved'], 'type': 'string' },
      'foreground': { 'type': 'string' },
      'passed': { 'type': 'boolean' },
      'requiredTrichromat': { 'type': 'number' }
    },
    'required': ['actualTrichromat', 'background', 'cvd', 'disposition', 'foreground', 'passed', 'requiredTrichromat'],
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
