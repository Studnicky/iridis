import type {
  CanonicalShapeType,
  NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Final standard contrast outcome for one named role pair; adjustedRole names its unique provenance-selected direct mover. */
export namespace ContrastReportEntryInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-report-entry',
    'additionalProperties': false,
    'properties': {
      'actual': { 'type': 'number' },
      'adjustedRole': { 'type': 'string' },
      'background': { 'type': 'string' },
      'disposition': {
        'enum': [
          'not-needed',
          'adjusted-foreground',
          'adjusted-background',
          'blocked-stated',
          'unresolved'
        ]
      },
      'foreground': { 'type': 'string' },
      'passed': { 'type': 'boolean' },
      'required': { 'type': 'number' }
    },
    'required': [
      'actual',
      'background',
      'disposition',
      'foreground',
      'passed',
      'required'
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
