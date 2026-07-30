import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** Shape of a single contrast report entry (written by enforce:contrast). */
export namespace ContrastReportEntryInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adjusted':   { 'type': 'boolean' },
      'algorithm':  { 'type': 'string' },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'minRatio':   { 'type': 'number' },
      'passed':     { 'type': 'boolean' },
      'ratio':      { 'type': 'number' }
    },
    'required': ['adjusted', 'algorithm', 'background', 'foreground', 'minRatio', 'passed', 'ratio'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
