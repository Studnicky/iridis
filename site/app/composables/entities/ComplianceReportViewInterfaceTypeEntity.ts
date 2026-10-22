import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Structural view of the engine `contrast:complianceReport` metadata value. */
export namespace ComplianceReportViewInterfaceTypeEntity {
  export const PairSchema = {
    'properties': {
      'actual': { 'type': 'number' },
      'background': { 'type': 'string' },
      'cvdTypes': { 'items': { 'type': 'string' }, 'type': 'array' },
      'disposition': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'required': { 'type': 'number' }
    },
    'required': ['actual', 'background', 'disposition', 'foreground', 'required'],
    'type': 'object'
  } as const;

  export const Schema = {
    '$id': 'https://iridis.dev/site/compliance-report-view',
    'properties': {
      'blockedPairs': { 'items': PairSchema, 'type': 'array' },
      'compliant': { 'type': 'boolean' },
      'cvdCompliant': { 'type': 'boolean' },
      'pairs': { 'items': PairSchema, 'type': 'array' },
      'selected': {
        'properties': {
          'algorithm': { 'enum': ['wcag21', 'apca'], 'type': 'string' },
          'level': { 'enum': ['AA', 'AAA', 'Lc'], 'type': 'string' }
        },
        'required': ['algorithm', 'level'],
        'type': 'object'
      }
    },
    'required': ['blockedPairs', 'compliant', 'cvdCompliant', 'pairs', 'selected'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
