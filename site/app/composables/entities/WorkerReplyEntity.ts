import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { ImageCombineResultEntity } from './ImageCombineResultEntity.ts';
import { ImageExtractionResultEntity } from './ImageExtractionResultEntity.ts';
import { PaletteSnapshotEntity } from './PaletteSnapshotEntity.ts';

/** Discriminated union of the replies the engine worker returns: the result for a request id, or the failure message. */
export namespace WorkerReplyEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/worker-reply',
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'failure': { 'type': 'string' },
          'id': { 'type': 'integer' },
          'kind': { 'const': 'palette', 'type': 'string' },
          'snapshot': PaletteSnapshotEntity.Schema
        },
        'required': ['id', 'kind'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'failure': { 'type': 'string' },
          'id': { 'type': 'integer' },
          'kind': { 'const': 'extract', 'type': 'string' },
          'result': ImageExtractionResultEntity.Schema
        },
        'required': ['id', 'kind'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'failure': { 'type': 'string' },
          'id': { 'type': 'integer' },
          'kind': { 'const': 'combine', 'type': 'string' },
          'result': ImageCombineResultEntity.Schema
        },
        'required': ['id', 'kind'],
        'type': 'object'
      }
    ]
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & (
    | { 'kind': 'combine'; 'result'?: ImageCombineResultEntity.Type }
    | { 'kind': 'extract'; 'result'?: ImageExtractionResultEntity.Type }
    | { 'kind': 'palette'; 'snapshot'?: PaletteSnapshotEntity.Type }
  );

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
