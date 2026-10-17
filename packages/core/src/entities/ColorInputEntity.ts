import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Canonical raw palette-color input. The binary ImageData variant retains its
 * pixel buffer while scalar and object variants describe color literals.
 */
export namespace ColorInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/color-input',
    'anyOf': [
      { 'type': 'boolean' },
      { 'type': 'null' },
      { 'type': 'number' },
      { 'type': 'string' },
      { 'items': {}, 'type': 'array' },
      {
        'additionalProperties': false,
        'properties': {
          'data':   {},
          'height': { 'type': 'number' },
          'width':  { 'type': 'number' }
        },
        'required': ['data', 'height', 'width'],
        'type': 'object'
      },
      { 'additionalProperties': true, 'type': 'object' }
    ]
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
