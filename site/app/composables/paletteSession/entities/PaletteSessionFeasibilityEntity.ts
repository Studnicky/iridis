import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';

const statuses = ['checking', 'failed', 'idle'] as const;

/** The schema-feasibility lane: whether a check is in flight, the newest report, and the failure of the last check. */
export namespace PaletteSessionFeasibilityEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/feasibility',
    'additionalProperties': false,
    'properties': {
      'error': { 'type': 'string' },
      'report': ContrastFeasibilityReportEntity.Schema,
      'status': { 'enum': statuses, 'type': 'string' }
    },
    'required': ['status'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'report'?: ContrastFeasibilityReportEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
