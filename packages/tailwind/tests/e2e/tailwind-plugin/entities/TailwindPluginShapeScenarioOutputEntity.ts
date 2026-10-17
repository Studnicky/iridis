import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Observed public plugin identity and registered task names. */
export namespace TailwindPluginShapeScenarioOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': { 'type': 'string' },
      'taskNames': { 'items': { 'type': 'string' }, 'type': 'array' },
      'version': { 'type': 'string' }
    },
    'required': ['name', 'taskNames', 'version'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
