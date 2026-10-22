import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { DerivationConfigInterfaceTypeEntity } from './DerivationConfigInterfaceTypeEntity.ts';
import { FramingInterfaceTypeEntity } from './FramingInterfaceTypeEntity.ts';
import { SchemaNameInterfaceTypeEntity } from './SchemaNameInterfaceTypeEntity.ts';

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
export namespace PaletteResolveRequestInterfaceTypeEntity {
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
      'derivationConfig': DerivationConfigInterfaceTypeEntity.Schema,
      'framing': FramingInterfaceTypeEntity.Schema,
      'schemaName': SchemaNameInterfaceTypeEntity.Schema,
      'seeds': {
        'items': seedSchema,
        'type': 'array'
      },
      'semanticHuesEnabled': { 'type': 'boolean' },
      'strictness': { 'type': 'integer' }
    },
    'required': [
      'colorSpace',
      'derivationConfig',
      'framing',
      'schemaName',
      'seeds',
      'semanticHuesEnabled',
      'strictness'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'derivationConfig': DerivationConfigInterfaceTypeEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
