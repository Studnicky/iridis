import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorRecordEntity } from './ColorRecordEntity.ts';

/** An unweighted median-cut bucket containing canonical color records. */
export namespace ClusterBucketEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/cluster-bucket',
    'additionalProperties': false,
    'properties': {
      'colors': { 'items': ColorRecordEntity.Schema, 'type': 'array' }
    },
    'required': ['colors'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
