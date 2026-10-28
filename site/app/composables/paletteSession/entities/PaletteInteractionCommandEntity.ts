import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { CvdModeEntity } from '../../entities/CvdModeEntity.ts';
import { FramingEntity } from '../../entities/FramingEntity.ts';
import { ModeEntity } from '../../entities/ModeEntity.ts';
import { NonMandatoryLevelEntity } from '../../entities/NonMandatoryLevelEntity.ts';
import { SchemaNameEntity } from '../../entities/SchemaNameEntity.ts';
import { ColorSpaceEntity } from './ColorSpaceEntity.ts';
import { PaletteImageCommandEntity } from './PaletteImageCommandEntity.ts';
import { PaletteSessionInputEntity } from './PaletteSessionInputEntity.ts';
import { PaletteSessionSeedEntity } from './PaletteSessionSeedEntity.ts';

const indexSchema = { 'minimum': 0, 'type': 'integer' } as const;

const hexListSchema = { 'items': PaletteSessionSeedEntity.HexSchema, 'minItems': 1, 'type': 'array' } as const;

/** A schema-admitted palette intent; each variant is discriminated by `interaction` and carries its own payload. */
export namespace PaletteInteractionCommandEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/interaction-command',
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.seed.set', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'hex': PaletteSessionSeedEntity.HexSchema, 'index': indexSchema },
            'required': ['hex', 'index'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.seed.add', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'hex': PaletteSessionSeedEntity.HexSchema },
            'required': ['hex'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.seed.remove', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'index': indexSchema },
            'required': ['index'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.seed.role.assign', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'index': indexSchema, 'role': { 'minLength': 1, 'type': 'string' } },
            'required': ['index'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.seeds.replace', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'hexes': { ...hexListSchema, 'maxItems': PaletteSessionInputEntity.maximumSeeds } },
            'required': ['hexes'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.schema.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'schemaName': SchemaNameEntity.Schema },
            'required': ['schemaName'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.framing.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'framing': FramingEntity.Schema },
            'required': ['framing'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.color-space.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'colorSpace': ColorSpaceEntity.Schema },
            'required': ['colorSpace'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.contrast.strictness.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'strictness': { 'maximum': 2, 'minimum': 0, 'type': 'integer' } },
            'required': ['strictness'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.strict-compliance.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'enableStrictCompliance': { 'type': 'boolean' } },
            'required': ['enableStrictCompliance'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.cvd-mode.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'cvdMode': CvdModeEntity.Schema },
            'required': ['cvdMode'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.non-mandatory-level.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'nonMandatoryLevel': NonMandatoryLevelEntity.Schema },
            'required': ['nonMandatoryLevel'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.mode.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'mode': ModeEntity.Schema },
            'required': ['mode'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': { 'const': 'palette.relationship.mode.select', 'type': 'string' },
          'payload': {
            'additionalProperties': false,
            'properties': { 'groupId': { 'minLength': 1, 'type': 'string' }, 'modeId': { 'minLength': 1, 'type': 'string' } },
            'required': ['groupId', 'modeId'],
            'type': 'object'
          }
        },
        'required': ['interaction', 'payload'],
        'type': 'object'
      },
      PaletteImageCommandEntity.Schema
    ]
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
