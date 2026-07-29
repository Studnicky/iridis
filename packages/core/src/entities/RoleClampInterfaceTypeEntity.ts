import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';
import { OklchInterfaceTypeEntity } from './OklchInterfaceTypeEntity.ts';

/** One clamp record written by `resolve:roles` when a seed color is nudged into a role's declared ranges. */
export namespace RoleClampInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'resolvedHex':   { 'type': 'string' },
      'resolvedOklch': OklchInterfaceTypeEntity.Schema,
      'seedHex':       { 'type': 'string' },
      'seedOklch':     OklchInterfaceTypeEntity.Schema
    },
    'required': ['resolvedHex', 'resolvedOklch', 'seedHex', 'seedOklch'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
