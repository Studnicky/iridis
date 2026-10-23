import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace ViewerActionOverridesEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/viewer-action-overrides',
    'additionalProperties': false,
    'properties': {
      'ariaLabel': { 'type': 'string' },
      'disabled': { 'type': 'boolean' },
      'label': { 'type': 'string' },
      'pressed': { 'type': 'boolean' },
      'shortcut': { 'type': 'string' },
      'title': { 'type': 'string' },
      'tone': { 'enum': ['default', 'danger'], 'type': 'string' }
    },
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
