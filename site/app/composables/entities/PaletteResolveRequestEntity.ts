import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { RoleRelationshipGraphEntity } from '@studnicky/iridis';

import { CvdModeEntity } from './CvdModeEntity.ts';
import { FramingEntity } from './FramingEntity.ts';
import { NonMandatoryLevelEntity } from './NonMandatoryLevelEntity.ts';
import { SchemaNameEntity } from './SchemaNameEntity.ts';

const seedSchema = {
  'additionalProperties': false,
  'properties': {
    'hex': { 'type': 'string' },
    'role': { 'type': 'string' }
  },
  'required': ['hex'],
  'type': 'object'
} as const;

/** JSON-serializable parameters of one palette resolution; identical on the main thread and in the worker. */
export namespace PaletteResolveRequestEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-resolve-request',
    'additionalProperties': false,
    'properties': {
      'colorSpace': {
        'enum': [
          'srgb',
          'displayP3'
        ],
        'type': 'string'
      },
      'cvdMode': CvdModeEntity.Schema,
      'enableStrictCompliance': { 'type': 'boolean' },
      'framing': FramingEntity.Schema,
      'nonMandatoryLevel': NonMandatoryLevelEntity.Schema,
      'relationshipGraph': RoleRelationshipGraphEntity.Schema,
      'schemaName': SchemaNameEntity.Schema,
      'seeds': {
        'items': seedSchema,
        'type': 'array'
      },
      'strictness': { 'type': 'integer' }
    },
    'required': [
      'colorSpace',
      'cvdMode',
      'enableStrictCompliance',
      'framing',
      'nonMandatoryLevel',
      'schemaName',
      'seeds',
      'strictness'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'relationshipGraph'?: RoleRelationshipGraphEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
