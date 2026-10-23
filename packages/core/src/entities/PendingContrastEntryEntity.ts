import type {
  CanonicalShapeType,
  NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastRatioSchema } from '../model/ContrastRatioSchema.ts';
import { ContrastPairEntity } from './ContrastPairEntity.ts';

/** A contrast pair queued during the nudge pass, held until reconciliation re-measures it against the terminal state.roles. */
export namespace PendingContrastEntryEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/pending-contrast-entry',
    'additionalProperties': false,
    'allOf': [
      {
        'else': {
          'properties': {
            'maximumContrastRatio': ContrastRatioSchema.apca,
            'minimumContrastRatio': ContrastRatioSchema.apca
          }
        },
        'if': {
          'properties': {
            'algo': { 'const': 'wcag21' }
          },
          'required': ['algo']
        },
        'then': {
          'properties': {
            'maximumContrastRatio': ContrastRatioSchema.wcag21,
            'minimumContrastRatio': ContrastRatioSchema.wcag21
          }
        }
      }
    ],
    'properties': {
      'adjusted': { 'type': 'boolean' },
      'adjustedRole': { 'type': 'string' },
      'adjustmentDisposition': {
        'enum': [
          'not-needed',
          'applied',
          'preserved-stated',
          'unresolved',
          'blocked-stated-both'
        ]
      },
      'algo': { 'enum': ['wcag21', 'apca'] },
      'constraints': {
        'items': {
          'enum': ['pin', 'range', 'hue-relationship', 'gamut', 'cvd-floor', 'cvd-drop'],
          'type': 'string'
        },
        'type': 'array',
        'uniqueItems': true
      },
      'maximumContrastRatio': ContrastRatioSchema.permissive,
      'minimumContrastRatio': ContrastRatioSchema.permissive,
      'pair': ContrastPairEntity.Schema,
      'target': { 'type': 'string' }
    },
    'required': [
      'adjusted',
      'adjustmentDisposition',
      'constraints',
      'algo',
      'minimumContrastRatio',
      'pair',
      'target'
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
