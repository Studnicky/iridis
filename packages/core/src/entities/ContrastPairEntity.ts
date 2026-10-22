import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastRatioSchema } from '../model/ContrastRatioSchema.ts';
import { ContrastAlgorithmTypeEntity } from './ContrastAlgorithmTypeEntity.ts';

/** One foreground/background contrast requirement, with an optional algorithm override. */
export namespace ContrastPairEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-pair',
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
      'algorithm': ContrastAlgorithmTypeEntity.Schema,
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'maximumContrastRatio': ContrastRatioSchema.permissive,
      'minimumContrastRatio': ContrastRatioSchema.permissive
    },
    'required': ['background', 'foreground'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  const schemaValidate = EntityCompiler.compile<Type>(Schema);

  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);

  export const validate = (value: JSONSchema7Type): value is Type => {
    if (!schemaValidate(value)) {
      return false;
    }

    const maximumContrastRatio = value.maximumContrastRatio;
    const minimumContrastRatio = value.minimumContrastRatio;
    const result = maximumContrastRatio === undefined || minimumContrastRatio === undefined || maximumContrastRatio >= minimumContrastRatio;
    return result;
  };
}
