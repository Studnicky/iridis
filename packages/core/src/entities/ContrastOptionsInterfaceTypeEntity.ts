import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';
import { ContrastPairInterfaceTypeEntity } from './ContrastPairInterfaceTypeEntity.ts';

/** `InputInterface.contrast`: run-level contrast enforcement options. */
export namespace ContrastOptionsInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'algorithm':  { 'enum': ['wcag21', 'apca'] },
      'cvdCorrect': { 'type': 'boolean' },
      'extra':      { 'items': ContrastPairInterfaceTypeEntity.Schema, 'type': 'array' },
      'level':      { 'type': 'string' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
