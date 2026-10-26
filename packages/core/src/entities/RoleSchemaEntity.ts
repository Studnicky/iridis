import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';

import { RoleSchemaSchema } from '../model/RoleSchemaSchema.ts';
import { RoleRelationshipGraphEntity } from './RoleRelationshipGraphEntity.ts';

/** Schema-authored palette-role vocabulary and its contrast requirements. */
export namespace RoleSchemaEntity {
  export const Schema = { ...RoleSchemaSchema } as const;

  export type Type = NominalSchemaType<typeof Schema> & {
    readonly 'relationshipGraph'?: RoleRelationshipGraphEntity.Type;
  };

  class SchemaIntake {
    static readonly #cache = new WeakMap<object, Type>();
    static readonly #intake = EntityCompiler.compileIntake<Type>(Schema);

    static intake(value: JSONSchema7Type | object): Type {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        const result = SchemaIntake.#intake(value);
        return result;
      }
      const cached = SchemaIntake.#cache.get(value);
      if (cached !== undefined) {
        return cached;
      }
      const admitted = SchemaIntake.#intake(value);
      const graphSource = admitted.relationshipGraph;
      const result = graphSource === undefined
        ? admitted
        : { ...admitted, 'relationshipGraph': RoleRelationshipGraphEntity.intake(graphSource) };
      SchemaIntake.#cache.set(value, result);
      return result;
    }
  }

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = SchemaIntake.intake;
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
