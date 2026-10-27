import type { CanonicalShapeType, InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PresentationControlCommandEntity } from './PresentationControlCommandEntity.ts';

/** An admitted command with the per-store sequence number it was created under. */
export namespace PresentationControlIntentEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/intent',
    'additionalProperties': false,
    'properties': {
      'command': PresentationControlCommandEntity.Schema,
      'sequence': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['command', 'sequence'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
