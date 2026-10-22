import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PaletteResolveRequestInterfaceTypeEntity } from './PaletteResolveRequestInterfaceTypeEntity.ts';

/** Message posted to the resolve host: a request tagged with its sequence id. */
export namespace PaletteResolveEnvelopeInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-resolve-envelope',
    'additionalProperties': false,
    'properties': {
      'id': { 'type': 'integer' },
      'request': PaletteResolveRequestInterfaceTypeEntity.Schema
    },
    'required': [
      'id',
      'request'
    ],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'request': PaletteResolveRequestInterfaceTypeEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
