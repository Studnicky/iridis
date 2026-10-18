import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Soft color metadata: role, intent, weight. */
export namespace ColorHintsInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/color-hints',
    'additionalProperties': false,
    'properties': {
      'intent': {
        'enum': [
          'text',
          'background',
          'accent',
          'muted',
          'critical',
          'positive',
          'link',
          'button',
          'onAccent',
          'onButton'
        ]
      },
      'role':   { 'type': 'string' },
      'weight': { 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
