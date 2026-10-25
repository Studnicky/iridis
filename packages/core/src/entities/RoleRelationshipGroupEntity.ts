import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { HarmonyModeEntity } from './HarmonyModeEntity.ts';
import { RoleRelationshipEntity } from './RoleRelationshipEntity.ts';

/** Anchor-centred authored relationship modes and role operations. */
export namespace RoleRelationshipGroupEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/role-relationship-group',
    'additionalProperties': false,
    'properties': {
      'anchor': { 'minLength': 1, 'type': 'string' },
      'defaultMode': { 'minLength': 1, 'type': 'string' },
      'id': { 'minLength': 1, 'type': 'string' },
      'modes': {
        'items': HarmonyModeEntity.Schema,
        'minItems': 1,
        'type': 'array'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'relationships': {
        'items': RoleRelationshipEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['anchor', 'defaultMode', 'id', 'modes', 'name', 'relationships'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
