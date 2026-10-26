import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { WeakIdentityMemo } from '../model/WeakIdentityMemo.ts';
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

  class GraphIntake {
    static readonly #cache = new WeakIdentityMemo<object, Type>();
    static readonly #intake = EntityCompiler.compileIntake<Type>(Schema);

    static intake(value: object): Type {
      if (Array.isArray(value)) {
        const result = GraphIntake.#intake(value);
        return result;
      }
      const result = GraphIntake.#cache.get(value, () => {
        const admitted = GraphIntake.#intake(value);
        return admitted;
      });
      return result;
    }
  }

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = GraphIntake.intake;
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
