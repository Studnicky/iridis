import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { CvdModeEntity } from '../../entities/CvdModeEntity.ts';
import { ExtractionSettingsEntity } from '../../entities/ExtractionSettingsEntity.ts';
import { FramingEntity } from '../../entities/FramingEntity.ts';
import { ModeEntity } from '../../entities/ModeEntity.ts';
import { NonMandatoryLevelEntity } from '../../entities/NonMandatoryLevelEntity.ts';
import { SchemaNameEntity } from '../../entities/SchemaNameEntity.ts';
import { ColorSpaceEntity } from './ColorSpaceEntity.ts';
import { PaletteSessionSeedEntity } from './PaletteSessionSeedEntity.ts';
import { RelationshipModeSelectionEntity } from './RelationshipModeSelectionEntity.ts';

/** Everything a palette resolution derives from; `mode` selects which seed list resolves and `relationshipModes` the chosen mode per relationship group. */
export namespace PaletteSessionInputEntity {
  export const maximumSeeds = 32;

  const seedListSchema = { 'items': PaletteSessionSeedEntity.Schema, 'maxItems': maximumSeeds, 'minItems': 1, 'type': 'array' } as const;

  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/input',
    'additionalProperties': false,
    'properties': {
      'colorSpace': ColorSpaceEntity.Schema,
      'cvdMode': CvdModeEntity.Schema,
      'enableStrictCompliance': { 'type': 'boolean' },
      'framing': FramingEntity.Schema,
      'imageSeeds': seedListSchema,
      'imageTuning': ExtractionSettingsEntity.Schema,
      'mode': ModeEntity.Schema,
      'nonMandatoryLevel': NonMandatoryLevelEntity.Schema,
      'pickerSeeds': seedListSchema,
      'relationshipModes': { 'items': RelationshipModeSelectionEntity.Schema, 'type': 'array' },
      'schemaName': SchemaNameEntity.Schema,
      'strictness': { 'maximum': 2, 'minimum': 0, 'type': 'integer' }
    },
    'required': [
      'colorSpace',
      'cvdMode',
      'enableStrictCompliance',
      'framing',
      'imageSeeds',
      'imageTuning',
      'mode',
      'nonMandatoryLevel',
      'pickerSeeds',
      'relationshipModes',
      'schemaName',
      'strictness'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'imageTuning': ExtractionSettingsEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
