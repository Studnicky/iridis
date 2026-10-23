import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

/** One CVD perceptual-stability advisory: a pair × deficiency-type combination that violates its published threshold. */
export namespace CvdPairWarningEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'background':                 { 'type': 'string' },
      'cvdType':                    { 'type': 'string' },
      'drop':                       { 'type': 'number' },
      'dropThreshold':              { 'type': 'number' },
      'foreground':                 { 'type': 'string' },
      'minimumSimulatedContrast':       { 'type': 'number' },
      'originalLuminanceContrast':  { 'type': 'number' },
      'simulatedContrastDropRatio': { 'type': 'number' },
      'simulatedContrastRatio':     { 'type': 'number' },
      'simulatedLuminanceContrast': { 'type': 'number' }
    },
    'required': [
      'background', 'cvdType', 'drop', 'dropThreshold', 'foreground',
      'minimumSimulatedContrast', 'originalLuminanceContrast',
      'simulatedContrastDropRatio', 'simulatedContrastRatio', 'simulatedLuminanceContrast'
    ],
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
