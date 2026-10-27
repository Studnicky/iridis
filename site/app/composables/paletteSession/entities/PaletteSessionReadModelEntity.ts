import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { FramingEntity } from '../../entities/FramingEntity.ts';
import { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import { PaletteSessionImageEntity } from './PaletteSessionImageEntity.ts';
import { PaletteSessionInputEntity } from './PaletteSessionInputEntity.ts';

/** What consumers read: the latest input, the image-intake state, the lifecycle status, and the newest admitted palette with its revision identity. */
export namespace PaletteSessionReadModelEntity {
  const statuses = ['failed', 'idle', 'resolving'] as const;

  export const ResolvedSchema = {
    '$id': 'https://iridis.dev/site/palette-session/resolved-palette',
    'additionalProperties': false,
    'properties': {
      'correlationId': { 'minLength': 1, 'type': 'string' },
      'framing': FramingEntity.Schema,
      'inputFingerprint': { 'minLength': 1, 'type': 'string' },
      'revision': { 'minimum': 0, 'type': 'integer' },
      'snapshot': PaletteSnapshotEntity.Schema
    },
    'required': ['correlationId', 'framing', 'inputFingerprint', 'revision', 'snapshot'],
    'type': 'object'
  } as const;

  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/read-model',
    'additionalProperties': false,
    'properties': {
      'correlationId': { 'minLength': 1, 'type': 'string' },
      'error': { 'type': 'string' },
      'image': PaletteSessionImageEntity.Schema,
      'input': PaletteSessionInputEntity.Schema,
      'resolved': ResolvedSchema,
      'revision': { 'minimum': 0, 'type': 'integer' },
      'status': { 'enum': statuses, 'type': 'string' },
      'withheld': { 'type': 'boolean' }
    },
    'required': ['correlationId', 'image', 'input', 'revision', 'status', 'withheld'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & {
    'image': PaletteSessionImageEntity.Type;
    'input': PaletteSessionInputEntity.Type;
    'resolved'?: NominalSchemaType<typeof ResolvedSchema> & { 'snapshot': PaletteSnapshotEntity.Type };
  };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
