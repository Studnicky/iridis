import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

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
      'hex': { 'type': 'string' },
      'lightness': { 'type': 'number' },
      'name': { 'type': 'string' }
    },
    'required': ['hex', 'lightness', 'name'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
