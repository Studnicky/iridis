import type { FromSchema, JsonValueType } from '@studnicky/types';

import type { ColorRecordInterfaceType } from '../types/index.ts';

import { Validator } from '../model/Validator.ts';

/** A weighted median-cut bucket: a list of color records plus their accumulated
 *  weight. `colors` is an array of full {@link ColorRecordInterfaceType} records
 *  and is not re-derived as a JSON Schema here (doing so would duplicate that
 *  entity's own schema); `Type` widens the compile-time shape via intersection.
 *  Shared by every math primitive that clusters weighted color buckets. */
export namespace ClusterWeightedBucketEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'totalWeight': { 'type': 'number' }
    },
    'required': ['totalWeight'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema> & { 'colors': ColorRecordInterfaceType[] };

  export function validate(candidate: JsonValueType | Type): candidate is Type {
    const result = new Validator().validate(Schema, candidate);
    return result.valid;
  }
}
