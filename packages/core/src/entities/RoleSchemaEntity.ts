import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import type { RoleRelationshipGraphEntity } from './RoleRelationshipGraphEntity.ts';

import { RoleSchemaSchema } from '../model/RoleSchemaSchema.ts';

/** Schema-authored palette-role vocabulary and its contrast requirements. */
export namespace RoleSchemaEntity {
  export const Schema = { ...RoleSchemaSchema } as const;

  export type Type = NominalSchemaType<typeof Schema> & {
    readonly 'relationshipGraph'?: RoleRelationshipGraphEntity.Type;
  };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
