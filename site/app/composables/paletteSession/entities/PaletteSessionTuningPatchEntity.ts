import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { ExtractionSettingsEntity } from '../../entities/ExtractionSettingsEntity.ts';

/** The extraction settings fields a tuning control changes; absent fields keep their current value. */
export namespace PaletteSessionTuningPatchEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/tuning-patch',
    'additionalProperties': false,
    'properties': ExtractionSettingsEntity.Schema.properties,
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'chromaRange'?: [number, number][]; 'lightnessRange'?: [number, number][] };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
