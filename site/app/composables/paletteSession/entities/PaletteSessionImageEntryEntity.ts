import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

import { ExtractionSettingsEntity } from '../../entities/ExtractionSettingsEntity.ts';
import { ImageExtractionResultEntity } from '../../entities/ImageExtractionResultEntity.ts';

const laneStatuses = ['extracting', 'failed', 'idle'] as const;

/** One uploaded image: its own extraction settings, Stage 1 outcome, chosen candidate, and extract-lane status. */
export namespace PaletteSessionImageEntryEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/image-entry',
    'additionalProperties': false,
    'properties': {
      'candidates': { 'items': GalleryCandidateOutputEntity.Schema, 'type': 'array' },
      'dominantColorRecords': ImageExtractionResultEntity.WeightedHexListSchema,
      'error': { 'type': 'string' },
      'histogram': ImageExtractionResultEntity.WeightedHexListSchema,
      'id': { 'minLength': 1, 'type': 'string' },
      'name': { 'type': 'string' },
      'selectedCandidateLabel': { 'minLength': 1, 'type': 'string' },
      'settings': ExtractionSettingsEntity.Schema,
      'source': { 'type': 'string' },
      'status': { 'enum': laneStatuses, 'type': 'string' }
    },
    'required': ['candidates', 'dominantColorRecords', 'histogram', 'id', 'name', 'settings', 'source', 'status'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'settings': ExtractionSettingsEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
