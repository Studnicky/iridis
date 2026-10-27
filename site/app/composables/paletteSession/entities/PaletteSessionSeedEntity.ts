import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** One palette seed: a six-digit hex colour and an optional role it is pinned to. */
export namespace PaletteSessionSeedEntity {
  export const HexSchema = {
    '$id': 'https://iridis.dev/site/palette-session/seed-hex',
    'pattern': '^#[0-9a-fA-F]{6}$',
    'type': 'string'
  } as const;

  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/seed',
    'additionalProperties': false,
    'properties': {
      'hex': HexSchema,
      'role': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['hex'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
