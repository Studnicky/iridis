import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Runtime rendering options carried by an admitted engine input. */
export namespace RuntimeOptionsInterfaceTypeEntity {
  export const Schema = {
    '$id':                'https://studnicky.dev/iridis/RuntimeOptions',
    'additionalProperties': false,
    'properties': {
      'colorSpace': { 'enum': ['srgb', 'displayP3'], 'type': 'string' },
      'extra':      { 'additionalProperties': true, 'type': 'object' },
      'framing':    { 'enum': ['dark', 'light'], 'type': 'string' }
    },
    'required': [],
    'type':     'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
