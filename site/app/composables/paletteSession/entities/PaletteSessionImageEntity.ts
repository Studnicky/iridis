import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import { ImageExtractionResultEntity } from '../../entities/ImageExtractionResultEntity.ts';
import { PaletteSessionImageEntryEntity } from './PaletteSessionImageEntryEntity.ts';

const combineStatuses = ['combining', 'failed', 'idle'] as const;

/** The image-intake state of a session: uploaded entries, the combined histogram and candidates, and the combine lane. */
export namespace PaletteSessionImageEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/image',
    'additionalProperties': false,
    'properties': {
      'candidates': { 'items': GalleryCandidateOutputEntity.Schema, 'type': 'array' },
      'combine': {
        'additionalProperties': false,
        'properties': {
          'error': { 'type': 'string' },
          'status': { 'enum': combineStatuses, 'type': 'string' }
        },
        'required': ['status'],
        'type': 'object'
      },
      'enableCombineLock': { 'type': 'boolean' },
      'entries': { 'items': PaletteSessionImageEntryEntity.Schema, 'type': 'array' },
      'histogram': ImageExtractionResultEntity.WeightedHexListSchema
    },
    'required': ['candidates', 'combine', 'enableCombineLock', 'entries', 'histogram'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
