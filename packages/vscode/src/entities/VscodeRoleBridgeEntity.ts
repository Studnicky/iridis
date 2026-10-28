import type { NominalSchemaType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { vscodeSeedRoleData } from '../data/vscodeSeedRoleData.ts';

class VscodeRoleBridgeSchema {
  static readonly #seedRoleNames = vscodeSeedRoleData.roleTiers[2].roleNames;

  static readonly #sourceCandidates = {
    'items': { 'minLength': 1, 'type': 'string' },
    'minItems': 1,
    'type': 'array',
    'uniqueItems': true
  } as const;

  static readonly #roles = {
    'additionalProperties': VscodeRoleBridgeSchema.#sourceCandidates,
    'maxProperties': VscodeRoleBridgeSchema.#seedRoleNames.length,
    'minProperties': VscodeRoleBridgeSchema.#seedRoleNames.length,
    'propertyNames': { 'enum': VscodeRoleBridgeSchema.#seedRoleNames },
    'type': 'object'
  } as const;

  static readonly schema = {
    '$id': 'https://iridis.dev/schema/vscode/role-bridge',
    'additionalProperties': false,
    'properties': {
      'framing': { 'enum': ['dark', 'light'], 'type': 'string' },
      'roles': VscodeRoleBridgeSchema.#roles
    },
    'required': ['framing', 'roles'],
    'type': 'object'
  } as const;
}

/** Maps resolved caller roles onto the canonical VS Code seed-role vocabulary. */
export namespace VscodeRoleBridgeEntity {
  export const Schema = { ...VscodeRoleBridgeSchema.schema } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export function validate(value: JSONSchema7Type | Type): value is Type {
    const result = new Validator().validate(Schema, value);
    const isValid = result.errors.length === 0;
    return isValid;
  }
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
