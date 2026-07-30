import type { FromSchema, JsonValueType } from '@studnicky/types';

import type { ColorRecordInterfaceType } from '../types/index.ts';

import { Validator } from '../model/Validator.ts';

/** A cluster merge candidate: a centroid color record plus its accumulated weight.
 *  `centroid` is a full nested {@link ColorRecordInterfaceType} and is not re-derived
 *  as a JSON Schema here (doing so would duplicate that entity's own schema); the
 *  `Schema`/`validate` pair below cover only `weight`, and `Type` widens the
 *  compile-time shape via intersection. */
export namespace ClusterMergeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'weight': { 'type': 'number' }
    },
    'required': ['weight'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema> & { 'centroid': ColorRecordInterfaceType };

  export function validate(candidate: JsonValueType | Type): candidate is Type {
    const result = new Validator().validate(Schema, candidate);
    return result.valid;
  }
}
