import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** Published CVD perceptual-stability threshold: the max contrast drop and minimum simulated contrast allowed for one deficiency type. See `CVD_THRESHOLDS` for derivation. */
export namespace CvdThresholdEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'dropMagnitude':        { 'type': 'number' },
      'minimumSimulatedContrast': { 'type': 'number' }
    },
    'required': ['dropMagnitude', 'minimumSimulatedContrast'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
