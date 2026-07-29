import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../../../src/model/Validator.ts';

/** Grey-ramp record count and target cluster count for clusterMedianCut. */
export namespace ClusterInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'k':     { 'type': 'number' }
    },
    'required': ['count', 'k'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
