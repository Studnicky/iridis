import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
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

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  };
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
