import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { RoleRelationshipGroupEntity } from './RoleRelationshipGroupEntity.ts';

/** Complete authored graph that defines how palette roles relate and derive. */
export namespace RoleRelationshipGraphEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/role-relationship-graph',
    'additionalProperties': false,
    'properties': {
      'groups': {
        'items': RoleRelationshipGroupEntity.Schema,
        'minItems': 1,
        'type': 'array'
      }
    },
    'required': ['groups'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
