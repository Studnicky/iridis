import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Flattened `{colors, roles, variants}` hex-string output written by `emit:json` to `state.outputs['core:json']`. */
export namespace JsonOutputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'colors': {
        'items': { 'type': 'string' },
        'type':  'array'
      },
      'roles': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'variants': {
        'additionalProperties': {
          'additionalProperties': { 'type': 'string' },
          'type': 'object'
        },
        'type': 'object'
      }
    },
    'required': ['colors', 'roles', 'variants'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
