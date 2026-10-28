import type {
  CanonicalShapeType, InferType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { ComplianceReportEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';

import { OutputRowsEntity } from './OutputRowsEntity.ts';

const hexMapSchema = {
  'additionalProperties': { 'type': 'string' },
  'type': 'object'
} as const;

const p3Schema = {
  'additionalProperties': false,
  'properties': {
    'b': { 'type': 'number' },
    'g': { 'type': 'number' },
    'r': { 'type': 'number' }
  },
  'required': [
    'b',
    'g',
    'r'
  ],
  'type': 'object'
} as const;

const roleSchema = {
  'additionalProperties': false,
  'properties': {
    'c': { 'type': 'number' },
    'displayP3': p3Schema,
    'h': { 'type': 'number' },
    'hex': { 'type': 'string' },
    'l': { 'type': 'number' },
    'name': { 'type': 'string' }
  },
  'required': [
    'c',
    'h',
    'hex',
    'l',
    'name'
  ],
  'type': 'object'
} as const;

const clampSchema = {
  'additionalProperties': false,
  'properties': {
    'resolvedHex': { 'type': 'string' },
    'roleName': { 'type': 'string' },
    'roleOklch': { 'type': 'string' },
    'seedHex': { 'type': 'string' },
    'seedOklch': { 'type': 'string' }
  },
  'required': [
    'resolvedHex',
    'roleName',
    'roleOklch',
    'seedHex',
    'seedOklch'
  ],
  'type': 'object'
} as const;

const provenanceSchema = {
  'additionalProperties': false,
  'properties': {
    'derived': {
      'items': { 'type': 'string' },
      'type': 'array'
    },
    'pinned': {
      'items': { 'type': 'string' },
      'type': 'array'
    },
    'synthesized': {
      'items': { 'type': 'string' },
      'type': 'array'
    }
  },
  'required': [
    'derived',
    'pinned',
    'synthesized'
  ],
  'type': 'object'
} as const;

/** JSON-serializable result of one palette resolution: the exact fields the page ingests. */
export namespace PaletteSnapshotEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-snapshot',
    'additionalProperties': false,
    'properties': {
      'clamps': {
        'items': clampSchema,
        'type': 'array'
      },
      'compliance': ComplianceReportEntity.Schema,
      'cvd': CvdResultSetEntity.Schema,
      'distances': {
        'additionalProperties': {
          'additionalProperties': { 'type': 'number' },
          'type': 'object'
        },
        'type': 'object'
      },
      'outputs': OutputRowsEntity.Schema,
      'provenance': provenanceSchema,
      'roles': {
        'items': roleSchema,
        'type': 'array'
      },
      'scales': {
        'additionalProperties': hexMapSchema,
        'type': 'object'
      }
    },
    'required': [
      'clamps',
      'distances',
      'provenance',
      'roles',
      'scales'
    ],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
