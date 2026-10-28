import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** The mode a user picked for one relationship group of the selected schema's graph. */
export namespace RelationshipModeSelectionEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/relationship-mode-selection',
    'additionalProperties': false,
    'properties': {
      'groupId': { 'minLength': 1, 'type': 'string' },
      'modeId': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['groupId', 'modeId'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
