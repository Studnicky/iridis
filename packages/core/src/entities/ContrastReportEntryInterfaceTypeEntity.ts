import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastRatioSchema } from '../model/ContrastRatioSchema.ts';
import { ContrastAlgorithmTypeEntity } from './ContrastAlgorithmTypeEntity.ts';

/** Shape of a single contrast report entry (written by enforce:contrast). */
export namespace ContrastReportEntryInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-report-entry',
    'additionalProperties': false,
    'allOf': [{
      'else': {
        'properties': {
          'maximumContrastRatio': ContrastRatioSchema.apca,
          'minimumContrastRatio': ContrastRatioSchema.apca
        }
      },
      'if': {
        'properties': {
          'algorithm': { 'const': 'wcag21' }
        },
        'required': ['algorithm']
      },
      'then': {
        'properties': {
          'maximumContrastRatio': ContrastRatioSchema.wcag21,
          'minimumContrastRatio': ContrastRatioSchema.wcag21
        }
      }
    }],
    'properties': {
      'adjusted':              { 'type': 'boolean' },
      'adjustmentDisposition': { 'enum': ['not-needed', 'applied', 'preserved-stated', 'unresolved'] },
      'algorithm':             ContrastAlgorithmTypeEntity.Schema,
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'maximumContrastRatio': ContrastRatioSchema.permissive,
      'minimumContrastRatio': ContrastRatioSchema.permissive,
      'passed':               { 'type': 'boolean' },
      'ratio':      { 'type': 'number' }
    },
    'required': ['adjusted', 'adjustmentDisposition', 'algorithm', 'background', 'foreground', 'minimumContrastRatio', 'passed', 'ratio'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
