
import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical Panda and UnoCSS theme output emitted by the Panda plugin. */
export namespace PandaOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/panda/theme-output',
    'additionalProperties': false,
    'properties': {
      'colors': {
        'additionalProperties': false,
        'properties': {
          'background': { 'type': 'string' }, 'border': { 'type': 'string' }, 'error': { 'type': 'string' },
          'info': { 'type': 'string' }, 'primary': { 'type': 'string' }, 'secondary': { 'type': 'string' },
          'success': { 'type': 'string' }, 'surface': { 'type': 'string' }, 'text': { 'type': 'string' },
          'textMuted': { 'type': 'string' }, 'warning': { 'type': 'string' }
        },
        'type': 'object'
      },
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
