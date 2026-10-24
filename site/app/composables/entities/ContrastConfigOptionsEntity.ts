import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { CvdModeEntity } from './CvdModeEntity.ts';
import { NonMandatoryLevelEntity } from './NonMandatoryLevelEntity.ts';

/** The three demo controls that select the engine's `input.contrast` configuration. */
export namespace ContrastConfigOptionsEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/contrast-config-options',
    'additionalProperties': false,
    'properties': {
      'cvdMode': CvdModeEntity.Schema,
      'enableStrictCompliance': { 'type': 'boolean' },
      'nonMandatoryLevel': NonMandatoryLevelEntity.Schema,
      'strictness': { 'type': 'integer' }
    },
    'required': ['cvdMode', 'enableStrictCompliance', 'nonMandatoryLevel', 'strictness'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
