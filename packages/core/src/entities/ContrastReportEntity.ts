import type {
  CanonicalShapeType,
  NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastReportEntryEntity } from './ContrastReportEntryEntity.ts';

/** Canonical final contrast admission report for an engine run. */
export namespace ContrastReportEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-report',
    'additionalProperties': false,
    'properties': {
      'compliant': { 'type': 'boolean' },
      'disposition': {
        'enum': ['resolved', 'best-effort', 'withheld'],
        'type': 'string'
      },
      'pairs': {
        'items': ContrastReportEntryEntity.Schema,
        'type': 'array'
      },
      'problemPairs': {
        'items': ContrastReportEntryEntity.Schema,
        'type': 'array'
      },
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
    'required': ['compliant', 'disposition', 'pairs', 'problemPairs', 'selected'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;
  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<
    Type,
    CanonicalShapeType<typeof Schema>
  >(Schema);
}
