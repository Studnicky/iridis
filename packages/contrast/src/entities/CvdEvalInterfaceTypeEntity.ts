import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** Result of evaluating one foreground/background pair against a single CVD matrix. */
export namespace CvdEvalInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'belowFloor':       { 'type': 'boolean' },
      'cvdType':          { 'enum': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'], 'type': 'string' },
      'drop':             { 'type': 'number' },
      'exceedsDrop':      { 'type': 'boolean' },
      'fail':             { 'type': 'boolean' },
      'originalContrast': { 'type': 'number' },
      'simContrast':      { 'type': 'number' }
    },
    'required': ['belowFloor', 'cvdType', 'drop', 'exceedsDrop', 'fail', 'originalContrast', 'simContrast'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
