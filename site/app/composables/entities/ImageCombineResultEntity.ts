import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

/** Combine-stage outcome: the heaviest histogram bins, the seed hexes extracted for the active schema, and the candidate palettes. */
export namespace ImageCombineResultEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/image-combine-result',
    'additionalProperties': false,
    'properties': {
      'candidates': { 'items': GalleryCandidateOutputEntity.Schema, 'type': 'array' },
      'extracted': { 'items': { 'type': 'string' }, 'type': 'array' },
      'histogram': {
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
      }
    },
    'required': [
      'candidates',
      'extracted',
      'histogram'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'candidates': GalleryCandidateOutputEntity.Type[] };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
