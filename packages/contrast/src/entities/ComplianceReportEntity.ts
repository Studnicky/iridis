import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { ComplianceBlockedPairEntity } from './ComplianceBlockedPairEntity.ts';
import { CompliancePairEntity } from './CompliancePairEntity.ts';

/** Canonical terminal admission report for rendered palette roles. */
export namespace ComplianceReportEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/contrast/compliance-report',
    'additionalProperties': false,
    'properties': {
      'blockedPairs': { 'items': ComplianceBlockedPairEntity.Schema, 'type': 'array' },
      'compliant': { 'type': 'boolean' },
      'cvdCompliant': { 'type': 'boolean' },
      'pairs': { 'items': CompliancePairEntity.Schema, 'type': 'array' },
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
    'required': ['blockedPairs', 'compliant', 'cvdCompliant', 'pairs', 'selected'],
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
