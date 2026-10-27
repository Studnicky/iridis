import type { CanonicalShapeType, InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** One role-sort criterion: a sortable role field and its direction. */
export namespace PresentationRoleSortKeyEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/role-sort-key',
    'additionalProperties': false,
    'properties': {
      'direction': { 'enum': ['ascending', 'descending'], 'type': 'string' },
      'field': { 'enum': ['name', 'lightness', 'chroma', 'hue', 'ratio', 'compliance'], 'type': 'string' }
    },
    'required': ['direction', 'field'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
