import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ColorInputEntity } from './ColorInputEntity.ts';
import { ContrastOptionsEntity } from './ContrastOptionsEntity.ts';
import { RoleSchemaEntity } from './RoleSchemaEntity.ts';
import { RuntimeOptionsEntity } from './RuntimeOptionsEntity.ts';

/** Canonical validated intake boundary for an engine palette request. */
export namespace InputEntity {
  export const Schema = {
    '$id':                'https://studnicky.dev/iridis/Input',
    'additionalProperties': false,
    'properties': {
      'colors': {
        'items': ColorInputEntity.Schema,
        'type':  'array'
      },
      'contrast':          ContrastOptionsEntity.Schema,
      'emit': {
        'items': { 'type': 'string' },
        'type':  'array'
      },
      'maximumColorCount': { 'type': 'number' },
      'metadata': {
        'additionalProperties': true,
        'type':                 'object'
      },
      'roles': RoleSchemaEntity.Schema,
      'runtime': RuntimeOptionsEntity.Schema
    },
    'required': ['colors'],
    'type':     'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & {
    readonly 'roles'?: RoleSchemaEntity.Type;
  };

  export const validate = EntityCompiler.compile<Type>(Schema);
  const schemaIntake = EntityCompiler.compileIntake<Type>(Schema);
  const schemaCreate = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);

  class SchemaIntake {
    static intake(value: Parameters<typeof schemaIntake>[0]): Type {
      const admitted = schemaIntake(value);
      const roleSchema = admitted.roles === undefined
        ? undefined
        : RoleSchemaEntity.intake(admitted.roles);
      const result = roleSchema === undefined
        ? admitted
        : { ...admitted, 'roles': roleSchema };
      return result;
    }
  }

  class ProgrammaticInput {
    static create(value: CanonicalShapeType<typeof Schema>): Type {
      const roleSchema = value.roles === undefined
        ? undefined
        : RoleSchemaEntity.intake(value.roles);
      const { maximumColorCount, ...finiteValue } = value;
      const admitted = maximumColorCount === Infinity
        ? schemaCreate(finiteValue)
        : schemaCreate({
          ...finiteValue,
          ...(maximumColorCount === undefined ? {} : { 'maximumColorCount': maximumColorCount })
        });
      if (roleSchema === undefined || admitted.roles === undefined) {
        const result = maximumColorCount === Infinity
          ? { ...admitted, 'maximumColorCount': Infinity }
          : admitted;
        return result;
      }
      const result = {
        ...admitted,
        'roles': roleSchema,
        ...(maximumColorCount === Infinity ? { 'maximumColorCount': Infinity } : {})
      };
      return result;
    }
  }

  /** Validates external input and admits its role schema into an immutable canonical form. */
  export const intake = SchemaIntake.intake;

  /** Builds a trusted programmatic request; Infinity is the sole unlimited count. */
  export const create = ProgrammaticInput.create;
}
