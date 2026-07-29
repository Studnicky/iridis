import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** Published CVD perceptual-stability threshold: the max contrast drop and minimum simulated contrast allowed for one deficiency type. See `CVD_THRESHOLDS` for derivation. */
export namespace CvdThresholdInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'dropMagnitude':        { 'type': 'number' },
      'minSimulatedContrast': { 'type': 'number' }
    },
    'required': ['dropMagnitude', 'minSimulatedContrast'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
