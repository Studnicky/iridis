import type { FromSchema, JsonValueType } from '@studnicky/types';

import { Validator } from '../model/Validator.ts';

/** One role's absolute-hue-target override — see `core:hueTargetOverrides`. */
export namespace HueTargetOverrideInterfaceTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'hue':      { 'type': 'number' },
      'hueClamp': { 'type': 'number' }
    },
    'required': ['hue'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonValueType): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
