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

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  const schemaCreate = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);

  class ProgrammaticInput {
    static create(value: CanonicalShapeType<typeof Schema>): Type {
      const { maximumColorCount, ...finiteValue } = value;
      if (maximumColorCount !== Infinity) {
        const result = schemaCreate({
          ...finiteValue,
          ...(maximumColorCount === undefined ? {} : { 'maximumColorCount': maximumColorCount })
        });
        return result;
      }

      const admitted = schemaCreate(finiteValue);
      const result = { ...admitted, 'maximumColorCount': Infinity };
      return result;
    }
  }

  /** Builds a trusted programmatic request; Infinity is the sole unlimited count. */
  export const create = ProgrammaticInput.create;
}
