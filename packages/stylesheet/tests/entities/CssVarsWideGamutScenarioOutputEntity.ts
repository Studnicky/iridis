import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { CSS_VARS_OUTPUT_SCHEMAS } from '../../src/constants/CssVarsOutputSchemas.ts';

export namespace CssVarsWideGamutScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-stylesheet/tests/CssVarsWideGamutScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'cssVars': {
        ...CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS,
        'required': ['darkScheme', 'forcedColors', 'full', 'map', 'rootBlock', 'scopedBlock', 'wideGamut']
      },
      'displayP3': {
        'additionalProperties': false,
        'properties': {
          'b': { 'type': 'number' },
          'g': { 'type': 'number' },
          'r': { 'type': 'number' }
        },
        'required': ['b', 'g', 'r'],
        'type': 'object'
      }
    },
    'required': ['cssVars'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
