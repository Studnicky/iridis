import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { CvdEvalEntity } from './CvdEvalEntity.ts';

/** Terminal selected-standard outcome for one semantic contrast pair. */
export namespace CompliancePairEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'actual': { 'type': 'number' },
      'adjustedRoles': {
        'items': { 'type': 'string' },
        'type': 'array',
        'uniqueItems': true
      },
      'background': { 'type': 'string' },
      'causes': {
        'items': {
          'enum': ['pin', 'range', 'hue-relationship', 'gamut', 'cvd', 'solver-exhausted'],
          'type': 'string'
        },
        'type': 'array',
        'uniqueItems': true
      },
      'cvd': {
        'items': CvdEvalEntity.Schema,
        'type': 'array'
      },
      'disposition': {
        'enum': ['resolved', 'best-effort', 'withheld'],
        'type': 'string'
      },
      'foreground': { 'type': 'string' },
      'passed': { 'type': 'boolean' },
      'required': { 'type': 'number' },
      'shortfall': { 'minimum': 0, 'type': 'number' }
    },
    'required': [
      'actual',
      'adjustedRoles',
      'background',
      'causes',
      'cvd',
      'disposition',
      'foreground',
      'passed',
      'required',
      'shortfall'
    ],
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
