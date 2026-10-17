import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace PandaThemeScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-panda/tests/PandaThemeScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'colors': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'pandaConfig': { 'type': 'string' },
      'unoConfig': { 'type': 'string' }
    },
    'required': ['colors', 'pandaConfig', 'unoConfig'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
