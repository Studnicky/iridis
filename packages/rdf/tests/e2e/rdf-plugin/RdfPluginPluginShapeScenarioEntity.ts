import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Runtime-validated output for RDF plugin public-shape scenarios. */
export namespace RdfPluginPluginShapeScenarioEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'annotateTaskMatchesExport': { 'type': 'boolean' },
      'pluginInstanceMatchesClass': { 'type': 'boolean' },
      'pluginName': { 'type': 'string' },
      'pluginVersion': { 'type': 'string' },
      'serializeTaskMatchesExport': { 'type': 'boolean' },
      'taskNames': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': [
      'annotateTaskMatchesExport',
      'pluginInstanceMatchesClass',
      'pluginName',
      'serializeTaskMatchesExport',
      'taskNames',
      'pluginVersion'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
