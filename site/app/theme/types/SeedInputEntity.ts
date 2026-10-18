import type { NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Canonical palette seed accepted by the role-pinning intake boundary. */
export namespace SeedInputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/seed-input',
    'anyOf': [
      { 'type': 'string' },
      {
        'additionalProperties': false,
        'properties': {
          'hex':  { 'type': 'string' },
          'role': { 'type': 'string' }
        },
        'required': ['hex', 'role'],
        'type': 'object'
      }
    ]
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
