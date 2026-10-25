import type {
  CanonicalShapeType,
  NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Final selected-standard outcome for one named role pair. */
export namespace ContrastReportEntryEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-report-entry',
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

  export type Type = NominalSchemaType<typeof Schema>;
  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<
    Type,
    CanonicalShapeType<typeof Schema>
  >(Schema);
}
