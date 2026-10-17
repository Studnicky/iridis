import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { CSS_VARS_OUTPUT_SCHEMAS } from '../../src/constants/CssVarsOutputSchemas.ts';

export namespace CssVarsScopedScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-stylesheet/tests/CssVarsScopedScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'scoped': {
        ...CSS_VARS_OUTPUT_SCHEMAS.CSS_VARS_SCOPED,
        'required': ['blocks', 'full', 'wideGamut']
      }
    },
    'required': ['scoped'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
