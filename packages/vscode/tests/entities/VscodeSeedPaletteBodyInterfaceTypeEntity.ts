import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Validates the structured palette body admitted by the VS Code seed-role task. */
export namespace VscodeSeedPaletteBodyInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://studnicky.dev/iridis-vscode/test/seed-palette-body',
    'additionalProperties': false,
    'properties': {
      'framing': { 'enum': ['dark', 'light'], 'type': 'string' },
      'roles': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'tier': { 'enum': [4, 8, 16, 64], 'type': 'number' }
    },
    'required': ['framing', 'roles', 'tier'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
