import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

const weightedHexListSchema = {
  'items': {
    'additionalProperties': false,
    'properties': {
      'hex': { 'type': 'string' },
      'weight': { 'type': 'number' }
    },
    'required': ['hex', 'weight'],
    'type': 'object'
  },
  'type': 'array'
} as const;

/** Stage 1 outcome for one image: its heaviest histogram bins, weighted dominant colors, and per-algorithm candidate palettes. */
export namespace ImageExtractionResultEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/image-extraction-result',
    'additionalProperties': false,
    'properties': {
      'candidates': { 'items': GalleryCandidateOutputEntity.Schema, 'type': 'array' },
      'dominantColorRecords': weightedHexListSchema,
      'histogram': weightedHexListSchema
    },
    'required': [
      'candidates',
      'dominantColorRecords',
      'histogram'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'candidates': GalleryCandidateOutputEntity.Type[] };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
