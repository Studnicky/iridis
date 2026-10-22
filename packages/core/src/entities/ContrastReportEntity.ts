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
      'pairs': {
        'items': ContrastReportEntryEntity.Schema,
        'type': 'array'
      },
      'selectedAlgorithm': { 'enum': ['wcag21', 'apca'] },
      'target': { 'type': 'string' }
    },
    'required': ['compliant', 'pairs', 'selectedAlgorithm', 'target'],
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
