import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** One scored candidate in the CVD-correction search: an OKLCH (l, c) pair plus its resulting rgb and contrast signals. */
export namespace CorrectionCandidateInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'allClear':           { 'type': 'boolean' },
      'c':                  { 'type': 'number' },
      'l':                  { 'type': 'number' },
      'rgb': {
        'additionalProperties': false,
        'properties': {
          'b': { 'type': 'number' },
          'g': { 'type': 'number' },
          'r': { 'type': 'number' }
        },
        'required': ['b', 'g', 'r'],
        'type': 'object'
      },
      'trichromatContrast': { 'type': 'number' },
      'worstSim':           { 'type': 'number' }
    },
    'required': ['allClear', 'c', 'l', 'rgb', 'trichromatContrast', 'worstSim'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
