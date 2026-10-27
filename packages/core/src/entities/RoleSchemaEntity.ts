import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { JsonObject } from '@studnicky/types/node';

import { RoleSchemaSchema } from '../model/RoleSchemaSchema.ts';
import { RoleRelationshipGraphEntity } from './RoleRelationshipGraphEntity.ts';

/** Schema-authored palette-role vocabulary and its contrast requirements. */
export namespace RoleSchemaEntity {
  export const Schema = { ...RoleSchemaSchema } as const;

  export type Type = NominalSchemaType<typeof Schema> & {
    readonly 'relationshipGraph'?: RoleRelationshipGraphEntity.Type;
  };

  class SchemaIntake {
    static readonly #intake = EntityCompiler.compileIntake<Type>(Schema);

    static intake(value: JSONSchema7Type | object): Type {
      const admitted = SchemaIntake.#intake(value);
      const graphSource = admitted.relationshipGraph;
      const normalized = graphSource === undefined
        ? admitted
        : { ...admitted, 'relationshipGraph': RoleRelationshipGraphEntity.intake(graphSource) };
      const result = SchemaIntake.freeze(normalized);
      return result;
    }

    private static freeze(value: Type): Type {
      SchemaIntake.freezeValue(value, new WeakSet<object>());
      return value;
    }

    private static freezeValue(value: object, seen: WeakSet<object>): void {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
      const keys = Reflect.ownKeys(value);
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (key === undefined) {
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor !== undefined &&
          (JsonObject.is(descriptor.value) || Array.isArray(descriptor.value))
        ) {
          SchemaIntake.freezeValue(descriptor.value, seen);
        }
      }
      Object.freeze(value);
    }
  }

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = SchemaIntake.intake;
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
