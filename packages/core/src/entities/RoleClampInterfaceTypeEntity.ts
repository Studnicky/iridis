import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
