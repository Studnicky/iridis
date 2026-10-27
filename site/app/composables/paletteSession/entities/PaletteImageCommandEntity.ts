import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { ExtractionSettingsEntity } from '../../entities/ExtractionSettingsEntity.ts';
import { ImageCombineResultEntity } from '../../entities/ImageCombineResultEntity.ts';
import { ImageExtractionResultEntity } from '../../entities/ImageExtractionResultEntity.ts';

const imageIdSchema = { 'minLength': 1, 'type': 'string' } as const;

/** Image-intake intents; hexes are never carried, the session derives them from its own entries. */
export namespace PaletteImageCommandEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/image-command',
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.entry.add', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'imageId': imageIdSchema, 'name': { 'type': 'string' }, 'source': { 'type': 'string' } },
            'required': ['imageId', 'name', 'source'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.entry.remove', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'imageId': imageIdSchema },
            'required': ['imageId'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.entry.settings.set', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'imageId': imageIdSchema, 'settings': ExtractionSettingsEntity.Schema },
            'required': ['imageId', 'settings'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.entry.candidate.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'imageId': imageIdSchema, 'label': { 'minLength': 1, 'type': 'string' } },
            'required': ['imageId'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.entry.extracted', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'imageId': imageIdSchema, 'result': ImageExtractionResultEntity.Schema },
            'required': ['imageId', 'result'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.entry.failed', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'imageId': imageIdSchema, 'message': { 'type': 'string' } },
            'required': ['imageId', 'message'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.tuning.set', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'settings': ExtractionSettingsEntity.Schema },
            'required': ['settings'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.combine.request', 'type': 'string' },
          'payload': { 'additionalProperties': false, 'properties': {}, 'type': 'object' }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.combine.lock.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'enableCombineLock': { 'type': 'boolean' } },
            'required': ['enableCombineLock'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.combine.applied', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'result': ImageCombineResultEntity.Schema },
            'required': ['result'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.image.combine.failed', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'message': { 'type': 'string' } },
            'required': ['message'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      }
    ]
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
