import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace ViewportStatusOptionsEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/viewport-status-options',
    'additionalProperties': false,
    'properties': {
      'canFit': { 'default': true, 'type': 'boolean' },
      'canPan': { 'default': true, 'type': 'boolean' },
      'hint': { 'default': 'drag · wheel', 'type': ['string', 'null'] },
      'mode': { 'enum': ['inline', 'modal'], 'type': 'string' },
      'zoomLevel': { 'type': ['number', 'null'] }
    },
    'required': ['mode', 'zoomLevel'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
