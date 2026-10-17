import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** OKLCH result of sRGB gamut mapping with an in-gamut status flag. */
export namespace GamutMapResultEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/gamut-map-result',
    'additionalProperties': false,
    'properties': {
      'c': { 'type': 'number' },
      'h': { 'type': 'number' },
      'inGamut': { 'type': 'boolean' },
      'l': { 'type': 'number' }
    },
    'required': ['c', 'h', 'inGamut', 'l'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
