import type { InferType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** OKLCH color: lightness, chroma, hue. */
export namespace OklchInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/oklch',
    'additionalProperties': false,
    'properties': {
      'c': { 'type': 'number' },
      'h': { 'type': 'number' },
      'l': { 'type': 'number' }
    },
    'required': ['c', 'h', 'l'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
