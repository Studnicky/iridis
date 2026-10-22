import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorRecordEntity } from './ColorRecordEntity.ts';

/** A cluster merge candidate: a canonical centroid color and its accumulated weight. */
export namespace ClusterMergeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/cluster-merge',
    'additionalProperties': false,
    'properties': {
      'centroid': ColorRecordEntity.Schema,
      'weight':   { 'type': 'number' }
    },
    'required': ['centroid', 'weight'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
