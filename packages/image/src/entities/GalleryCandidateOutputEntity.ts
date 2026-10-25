import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { ColorRecordEntity } from '@studnicky/iridis';

import { GalleryAlgorithmTypeEntity } from './GalleryAlgorithmTypeEntity.ts';

/** Serializable candidate palette emitted at metadata.gallery:candidates. */
export namespace GalleryCandidateOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/image/gallery-candidate-output',
    'additionalProperties': false,
    'properties': {
      'algorithm': GalleryAlgorithmTypeEntity.Schema,
      'colors':    { 'items': ColorRecordEntity.Schema, 'type': 'array' },
      'k':         { 'minimum': 0, 'type': 'number' },
      'label':     { 'type': 'string' }
    },
    'required': ['algorithm', 'colors', 'k', 'label'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
