import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { GalleryAlgorithmTypeEntity } from '@studnicky/iridis-image';

const rangeListSchema = {
  'items': {
    'items': { 'type': 'number' },
    'maxItems': 2,
    'minItems': 2,
    'type': 'array'
  },
  'type': 'array'
} as const;

/** Gallery extraction knobs of one image extraction or of the combine stage. */
export namespace ExtractionSettingsEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/extraction-settings',
    'additionalProperties': false,
    'properties': {
      'algorithm': GalleryAlgorithmTypeEntity.Schema,
      'chromaRange': rangeListSchema,
      'deltaECap': { 'type': 'number' },
      'harmonizeThreshold': { 'type': 'number' },
      'histogramBits': { 'type': 'number' },
      'k': { 'type': 'number' },
      'lightnessRange': rangeListSchema
    },
    'required': [
      'algorithm',
      'chromaRange',
      'deltaECap',
      'harmonizeThreshold',
      'histogramBits',
      'k',
      'lightnessRange'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'chromaRange': [number, number][]; 'lightnessRange': [number, number][] };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
