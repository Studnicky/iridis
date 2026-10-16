import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Shape of a single contrast report entry (written by enforce:contrast). */
export namespace ContrastReportEntryInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adjusted':              { 'type': 'boolean' },
      'adjustmentDisposition': { 'enum': ['not-needed', 'applied', 'preserved-stated', 'unresolved'] },
      'algorithm':             { 'type': 'string' },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'maxRatio':   { 'maximum': 21, 'minimum': 1, 'type': 'number' },
      'minRatio':   { 'maximum': 21, 'minimum': 1, 'type': 'number' },
      'passed':     { 'type': 'boolean' },
      'ratio':      { 'type': 'number' }
    },
    'required': ['adjusted', 'adjustmentDisposition', 'algorithm', 'background', 'foreground', 'minRatio', 'passed', 'ratio'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
