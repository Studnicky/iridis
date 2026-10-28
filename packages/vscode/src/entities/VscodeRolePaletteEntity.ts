import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { ColorRecordEntity } from '@studnicky/iridis';

import { vscodeSeedRoleData } from '../data/vscodeSeedRoleData.ts';

class VscodeRolePaletteSchema {
  static readonly #seedRoleTier = vscodeSeedRoleData.roleTiers[2];
  static readonly #seedRoleNames = VscodeRolePaletteSchema.#seedRoleTier.roleNames;

  static readonly schema = {
    '$id': 'https://iridis.dev/schema/vscode/role-palette',
    'additionalProperties': false,
    'properties': {
      'framing': { 'enum': ['dark', 'light'], 'type': 'string' },
      'roles': {
        'additionalProperties': ColorRecordEntity.Schema,
        'maxProperties': VscodeRolePaletteSchema.#seedRoleNames.length,
        'minProperties': VscodeRolePaletteSchema.#seedRoleNames.length,
        'propertyNames': { 'enum': VscodeRolePaletteSchema.#seedRoleNames },
        'type': 'object'
      },
      'tier': { 'const': VscodeRolePaletteSchema.#seedRoleTier.tier, 'type': 'number' }
    },
    'required': ['framing', 'roles', 'tier'],
    'type': 'object'
  } as const;
}

/** Admits the canonical sixteen-role seed palette consumed by the VS Code pipeline. */
export namespace VscodeRolePaletteEntity {
  export const Schema = { ...VscodeRolePaletteSchema.schema } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
