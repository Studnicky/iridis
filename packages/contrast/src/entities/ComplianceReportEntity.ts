import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { CompliancePairEntity } from './CompliancePairEntity.ts';

/** Canonical terminal admission report for rendered palette roles. */
export namespace ComplianceReportEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/contrast/compliance-report',
    'additionalProperties': false,
    'properties': {
      'compliant': { 'type': 'boolean' },
      'cvdCompliant': { 'type': 'boolean' },
      'pairs': { 'items': CompliancePairEntity.Schema, 'type': 'array' },
      'problemPairs': { 'items': CompliancePairEntity.Schema, 'type': 'array' },
      'selected': {
        'additionalProperties': false,
        'properties': {
          'algorithm': { 'enum': ['wcag21', 'apca'], 'type': 'string' },
          'level': { 'type': 'string' }
        },
        'required': ['algorithm', 'level'],
        'type': 'object'
      }
    },
    'required': ['compliant', 'cvdCompliant', 'pairs', 'problemPairs', 'selected'],
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
