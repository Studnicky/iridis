import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { ColorRecordEntity } from '@studnicky/iridis';

import { vscodeSeedRoleData } from '../data/vscodeSeedRoleData.ts';

class VscodeRoleProjectionSchema {
  static readonly #seedRoleNames = vscodeSeedRoleData.roleTiers[2].roleNames;

  static readonly #role = {
    'additionalProperties': false,
    'properties': {
      'color': ColorRecordEntity.Schema,
      'sourceRole': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['color', 'sourceRole'],
    'type': 'object'
  } as const;

  static readonly schema = {
    '$id': 'https://iridis.dev/schema/vscode/role-projection',
    'additionalProperties': false,
    'properties': {
      'framing': { 'enum': ['dark', 'light'], 'type': 'string' },
      'roles': {
        'additionalProperties': VscodeRoleProjectionSchema.#role,
        'maxProperties': VscodeRoleProjectionSchema.#seedRoleNames.length,
        'minProperties': VscodeRoleProjectionSchema.#seedRoleNames.length,
        'propertyNames': { 'enum': VscodeRoleProjectionSchema.#seedRoleNames },
        'type': 'object'
      }
    },
    'required': ['framing', 'roles'],
    'type': 'object'
  } as const;
}

/** Records the resolved caller role selected for each canonical VS Code seed role. */
export namespace VscodeRoleProjectionEntity {
  export const Schema = { ...VscodeRoleProjectionSchema.schema } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
