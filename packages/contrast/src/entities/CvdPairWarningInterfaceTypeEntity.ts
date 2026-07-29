import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** One CVD perceptual-stability advisory: a pair × deficiency-type combination that violates its published threshold. */
export namespace CvdPairWarningInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'background':                 { 'type': 'string' },
      'cvdType':                    { 'type': 'string' },
      'drop':                       { 'type': 'number' },
      'dropThreshold':              { 'type': 'number' },
      'foreground':                 { 'type': 'string' },
      'minSimulatedContrast':       { 'type': 'number' },
      'originalLuminanceContrast':  { 'type': 'number' },
      'simulatedContrastDropRatio': { 'type': 'number' },
      'simulatedContrastRatio':     { 'type': 'number' },
      'simulatedLuminanceContrast': { 'type': 'number' }
    },
    'required': [
      'background', 'cvdType', 'drop', 'dropThreshold', 'foreground',
      'minSimulatedContrast', 'originalLuminanceContrast',
      'simulatedContrastDropRatio', 'simulatedContrastRatio', 'simulatedLuminanceContrast'
    ],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
