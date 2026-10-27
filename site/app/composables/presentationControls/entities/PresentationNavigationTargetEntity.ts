import type { CanonicalShapeType, InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** The page section a navigation request addresses. */
export namespace PresentationNavigationTargetEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/navigation-target',
    'additionalProperties': false,
    'properties': {
      'targetId': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['targetId'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
