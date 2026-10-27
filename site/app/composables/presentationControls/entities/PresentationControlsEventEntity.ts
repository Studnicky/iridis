import type { CanonicalShapeType, InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PresentationControlIntentEntity } from './PresentationControlIntentEntity.ts';

/** Machine event carrying one published intent. */
export namespace PresentationControlsEventEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/event',
    'additionalProperties': false,
    'properties': {
      'intent': PresentationControlIntentEntity.Schema,
      'type': { 'const': 'PRESENTATION_CONTROL_INTENT', 'type': 'string' }
    },
    'required': ['intent', 'type'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
