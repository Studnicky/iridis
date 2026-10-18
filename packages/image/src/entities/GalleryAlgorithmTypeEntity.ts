import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical selector for gallery extraction algorithms. */
export namespace GalleryAlgorithmTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-image/gallery-algorithm',
    'enum': ['median-cut', 'delta-e', 'k-means', 'wu-quantize'],
    'type': 'string'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
