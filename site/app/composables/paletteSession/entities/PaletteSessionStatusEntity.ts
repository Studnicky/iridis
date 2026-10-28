import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** The merged lane status of a session: any work in flight, the first reported failure, and whether the palette lane is resolving. */
export namespace PaletteSessionStatusEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/status',
    'additionalProperties': false,
    'properties': {
      'error': { 'type': ['null', 'string'] },
      'resolving': { 'type': 'boolean' },
      'running': { 'type': 'boolean' }
    },
    'required': ['error', 'resolving', 'running'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
