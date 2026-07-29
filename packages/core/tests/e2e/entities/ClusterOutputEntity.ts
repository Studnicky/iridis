import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** Resulting cluster count from clusterMedianCut. */
export namespace ClusterOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'resultLength': { 'type': 'number' }
    },
    'required': ['resultLength'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
