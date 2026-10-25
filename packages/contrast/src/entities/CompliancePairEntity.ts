import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { ContrastFeasibilityProofEntity } from './ContrastFeasibilityProofEntity.ts';

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
      'constraints': {
        'items': {
          'enum': ['pin', 'range', 'hue-relationship', 'gamut', 'cvd-floor', 'cvd-drop'],
          'type': 'string'
        },
        'type': 'array',
        'uniqueItems': true
      },
      'foreground': { 'type': 'string' },
      'passed': { 'type': 'boolean' },
      'proof': ContrastFeasibilityProofEntity.Schema,
      'required': { 'type': 'number' },
      'shortfall': { 'minimum': 0, 'type': 'number' }
    },
    'required': [
      'actual',
      'adjustedRoles',
      'background',
      'constraints',
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
