import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Histogram slot gallery:histogram writes into the engine metadata. */
export namespace GalleryHistogramSlotEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/gallery-histogram-slot',
    'properties': {
      'binCount': { 'type': 'number' },
      'bins': {
        'items': {
          'properties': {
            'hex': { 'type': 'string' },
            'weight': { 'type': 'number' }
          },
          'required': ['hex', 'weight'],
          'type': 'object'
        },
        'type': 'array'
      },
      'totalPixels': { 'type': 'number' }
    },
    'required': [
      'binCount',
      'bins',
      'totalPixels'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
