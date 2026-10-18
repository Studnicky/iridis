import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorRecordInterfaceTypeEntity } from './ColorRecordInterfaceTypeEntity.ts';

/** A weighted median-cut bucket containing canonical color records and accumulated weight. */
export namespace ClusterWeightedBucketEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/cluster-weighted-bucket',
    'additionalProperties': false,
    'properties': {
      'colors':      { 'items': ColorRecordInterfaceTypeEntity.Schema, 'type': 'array' },
      'totalWeight': { 'type': 'number' }
    },
    'required': ['colors', 'totalWeight'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
