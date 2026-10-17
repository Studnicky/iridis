import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastRatioSchema } from '../model/ContrastRatioSchema.ts';
import { ContrastPairInterfaceTypeEntity } from './ContrastPairInterfaceTypeEntity.ts';

/** A contrast pair queued during the nudge pass, held until reconciliation re-measures it against the terminal state.roles. */
export namespace PendingContrastEntryInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/pending-contrast-entry',
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
    }],
    'properties': {
      'adjusted':              { 'type': 'boolean' },
      'adjustmentDisposition': { 'enum': ['not-needed', 'applied', 'preserved-stated', 'unresolved'] },
      'algo':                  { 'enum': ['wcag21', 'apca'] },
      'maximumContrastRatio': ContrastRatioSchema.permissive,
      'minimumContrastRatio': ContrastRatioSchema.permissive,
      'pair':                 ContrastPairInterfaceTypeEntity.Schema
    },
    'required': ['adjusted', 'adjustmentDisposition', 'algo', 'minimumContrastRatio', 'pair'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
