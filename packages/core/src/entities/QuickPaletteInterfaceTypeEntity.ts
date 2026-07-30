import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/**
 * Output shape of {@link import('../QuickPalette.ts').QuickPalette.resolve}: the
 * four canonical roles, each resolved to a 6-digit hex string.
 */
export namespace QuickPaletteInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'accent':     { 'type': 'string' },
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'muted':      { 'type': 'string' }
    },
    'required': ['accent', 'background', 'foreground', 'muted'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
