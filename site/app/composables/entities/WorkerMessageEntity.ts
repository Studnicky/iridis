import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { CvdModeEntity } from './CvdModeEntity.ts';
import { DerivationConfigEntity } from './DerivationConfigEntity.ts';
import { ExtractionSettingsEntity } from './ExtractionSettingsEntity.ts';
import { FramingEntity } from './FramingEntity.ts';
import { NonMandatoryLevelEntity } from './NonMandatoryLevelEntity.ts';
import { PaletteResolveRequestEntity } from './PaletteResolveRequestEntity.ts';
import { SchemaNameEntity } from './SchemaNameEntity.ts';

/** Discriminated union of the messages the main thread posts to the engine worker; `palette`, `extract`, and `combine` are request lanes, `pixels` and `release` are lane-less commands. */
export namespace WorkerMessageEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/worker-message',
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'kind': { 'const': 'palette', 'type': 'string' },
          'request': PaletteResolveRequestEntity.Schema
        },
        'required': ['kind', 'request'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'kind': { 'const': 'schema-feasibility', 'type': 'string' },
          'request': PaletteResolveRequestEntity.Schema
        },
        'required': ['kind', 'request'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'imageId': { 'type': 'string' },
          'kind': { 'const': 'extract', 'type': 'string' },
          'settings': ExtractionSettingsEntity.Schema
        },
        'required': ['imageId', 'kind', 'settings'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'colorSpace': { 'enum': ['srgb', 'displayP3'], 'type': 'string' },
          'cvdMode': CvdModeEntity.Schema,
          'derivationConfig': DerivationConfigEntity.Schema,
          'enableStrictCompliance': { 'type': 'boolean' },
          'framing': FramingEntity.Schema,
          'hexes': { 'items': { 'type': 'string' }, 'type': 'array' },
          'kind': { 'const': 'combine', 'type': 'string' },
          'nonMandatoryLevel': NonMandatoryLevelEntity.Schema,
          'schemaName': SchemaNameEntity.Schema,
          'semanticHuesEnabled': { 'type': 'boolean' },
          'settings': ExtractionSettingsEntity.Schema,
          'strictness': { 'type': 'integer' }
        },
        'required': [
          'colorSpace',
          'cvdMode',
          'derivationConfig',
          'enableStrictCompliance',
          'framing',
          'hexes',
          'kind',
          'nonMandatoryLevel',
          'schemaName',
          'semanticHuesEnabled',
          'settings',
          'strictness'
        ],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'height': { 'type': 'integer' },
          'imageId': { 'type': 'string' },
          'kind': { 'const': 'pixels', 'type': 'string' },
          'width': { 'type': 'integer' }
        },
        'required': ['height', 'imageId', 'kind', 'width'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'imageId': { 'type': 'string' },
          'kind': { 'const': 'release', 'type': 'string' }
        },
        'required': ['imageId', 'kind'],
        'type': 'object'
      }
    ]
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & (
    | { 'derivationConfig': DerivationConfigEntity.Type; 'kind': 'combine'; 'settings': ExtractionSettingsEntity.Type }
    | { 'kind': 'extract'; 'settings': ExtractionSettingsEntity.Type }
    | { 'kind': 'palette'; 'request': PaletteResolveRequestEntity.Type }
    | { 'kind': 'schema-feasibility'; 'request': PaletteResolveRequestEntity.Type }
    | { 'kind': 'pixels' }
    | { 'kind': 'release' }
  );

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
