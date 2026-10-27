import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PaletteInteractionCommandEntity } from './PaletteInteractionCommandEntity.ts';

/** One admitted command stamped with its correlation id and the session revision it produces. */
export namespace PaletteInteractionEnvelopeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/interaction-envelope',
    'additionalProperties': false,
    'properties': {
      'command': PaletteInteractionCommandEntity.Schema,
      'correlationId': { 'minLength': 1, 'type': 'string' },
      'revision': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['command', 'correlationId', 'revision'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'command': PaletteInteractionCommandEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
