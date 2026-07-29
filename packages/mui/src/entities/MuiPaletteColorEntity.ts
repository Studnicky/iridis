import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/** MUI's `PaletteColor` shape: base tone plus its light/dark steps and paired text. */
export namespace MuiPaletteColorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'contrastText': { 'type': 'string' },
      'dark':         { 'type': 'string' },
      'light':        { 'type': 'string' },
      'main':         { 'type': 'string' }
    },
    'required': ['contrastText', 'dark', 'light', 'main'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
