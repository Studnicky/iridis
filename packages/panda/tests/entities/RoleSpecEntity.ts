import type { FromSchema, JsonObjectType } from '@studnicky/types';

import { Validator } from '@studnicky/iridis/model';

/**
 * One candidate spec used by test fixtures: the hex fed to intake:hex,
 * paired with the OKLCH lightness resolve:roles should nudge a role's range
 * toward, and the role name it seeds.
 */
export namespace RoleSpecEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-panda/tests/RoleSpec',
    'additionalProperties': false,
    'properties': {
      'hex':       { 'type': 'string' },
      'lightness': { 'type': 'number' },
      'name':      { 'type': 'string' }
    },
    'required': ['hex', 'lightness', 'name'],
    'type': 'object'
  } as const;

  export type Type = FromSchema<typeof Schema>;

  export const validate = (value: JsonObjectType[string]): value is Type => {
    const result = new Validator().validate(Schema, value);
    return result.valid;
  };
}
