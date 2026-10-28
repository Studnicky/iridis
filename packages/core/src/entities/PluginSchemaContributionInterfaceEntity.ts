import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** A JSON Schema object contributed by a plugin for output/metadata slot validation. */
export namespace PluginSchemaContributionInterfaceEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'inputMetadata': { 'type': 'object' },
      'metadata': { 'type': 'object' },
      'outputs':  { 'type': 'object' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
