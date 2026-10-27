import type { CanonicalShapeType, InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PresentationNavigationTargetEntity } from './PresentationNavigationTargetEntity.ts';

/** Side effect the machine requests after a transition. */
export namespace PresentationControlsEffectEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/effect',
    'additionalProperties': false,
    'properties': {
      'navigationTarget': PresentationNavigationTargetEntity.Schema,
      'variant': { 'const': 'navigation-target-selected', 'type': 'string' }
    },
    'required': ['navigationTarget', 'variant'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
