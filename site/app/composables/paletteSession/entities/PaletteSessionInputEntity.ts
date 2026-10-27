import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { CvdModeEntity } from '../../entities/CvdModeEntity.ts';
import { ExtractionSettingsEntity } from '../../entities/ExtractionSettingsEntity.ts';
import { FramingEntity } from '../../entities/FramingEntity.ts';
import { NonMandatoryLevelEntity } from '../../entities/NonMandatoryLevelEntity.ts';
import { SchemaNameEntity } from '../../entities/SchemaNameEntity.ts';
import { ColorSpaceEntity } from './ColorSpaceEntity.ts';
import { PaletteSessionSeedEntity } from './PaletteSessionSeedEntity.ts';

/**
 * Everything a palette resolution derives from. Role relationships come from the
 * selected schema's own graph; a working-graph override field joins here when
 * graph-edit commands exist.
 */
export namespace PaletteSessionInputEntity {
  export const maximumSeeds = 32;

  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/input',
    'additionalProperties': false,
    'properties': {
      'colorSpace': ColorSpaceEntity.Schema,
      'cvdMode': CvdModeEntity.Schema,
      'enableStrictCompliance': { 'type': 'boolean' },
      'framing': FramingEntity.Schema,
      'imageTuning': ExtractionSettingsEntity.Schema,
      'nonMandatoryLevel': NonMandatoryLevelEntity.Schema,
      'schemaName': SchemaNameEntity.Schema,
      'seeds': { 'items': PaletteSessionSeedEntity.Schema, 'maxItems': maximumSeeds, 'minItems': 1, 'type': 'array' },
      'strictness': { 'maximum': 2, 'minimum': 0, 'type': 'integer' }
    },
    'required': [
      'colorSpace',
      'cvdMode',
      'enableStrictCompliance',
      'framing',
      'imageTuning',
      'nonMandatoryLevel',
      'schemaName',
      'seeds',
      'strictness'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'imageTuning': ExtractionSettingsEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
