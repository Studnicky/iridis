import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { CvdModeEntity } from './CvdModeEntity.ts';
import { DerivationConfigEntity } from './DerivationConfigEntity.ts';
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
      'derivationConfig': DerivationConfigEntity.Schema,
      'enableStrictCompliance': { 'type': 'boolean' },
      'framing': FramingEntity.Schema,
      'nonMandatoryLevel': NonMandatoryLevelEntity.Schema,
      'schemaName': SchemaNameEntity.Schema,
      'seeds': {
        'items': seedSchema,
        'type': 'array'
      },
      'semanticHuesEnabled': { 'type': 'boolean' },
      'strictness': { 'type': 'integer' }
    },
    'required': [
      'colorSpace',
      'cvdMode',
      'derivationConfig',
      'enableStrictCompliance',
      'framing',
      'nonMandatoryLevel',
      'schemaName',
      'seeds',
      'semanticHuesEnabled',
      'strictness'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'derivationConfig': DerivationConfigEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
