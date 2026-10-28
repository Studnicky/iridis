import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical alpha bytes used by transparent VS Code workbench paint properties. */
export namespace VscodeAlphaByteEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/vscode/alpha-byte',
    'enum': ['20', '25', '30', '40', '50', '60', '70', '80'],
    'type': 'string'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
