import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical output contract for public Shadcn plugin-shape inspection. */
export namespace PluginShapeScenarioOutputEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-shadcn/tests/PluginShapeScenarioOutput',
    'additionalProperties': false,
    'properties': {
      'isInstance': { 'type': 'boolean' },
      'name': { 'type': 'string' },
      'outputSchemaClosed': { 'type': 'boolean' },
      'satisfiesPluginShape': { 'type': 'boolean' },
      'taskNames': { 'items': { 'type': 'string' }, 'type': 'array' },
      'version': { 'type': 'string' }
    },
    'required': ['isInstance', 'name', 'outputSchemaClosed', 'satisfiesPluginShape', 'taskNames', 'version'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
