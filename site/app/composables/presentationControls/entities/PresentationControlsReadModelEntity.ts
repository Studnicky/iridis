import type { CanonicalShapeType, InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PresentationControlCommandEntity } from './PresentationControlCommandEntity.ts';
import { PresentationCvdPreviewTypeEntity } from './PresentationCvdPreviewTypeEntity.ts';
import { PresentationNavigationTargetEntity } from './PresentationNavigationTargetEntity.ts';
import { PresentationRoleSortKeyEntity } from './PresentationRoleSortKeyEntity.ts';

/** The display-only control state every presentation consumer reads. */
export namespace PresentationControlsReadModelEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/read-model',
    'additionalProperties': false,
    'properties': {
      'cvdPreviewTypes': { 'items': PresentationCvdPreviewTypeEntity.Schema, 'type': 'array', 'uniqueItems': true },
      'diagramExpanded': { 'type': 'boolean' },
      'navigationTarget': PresentationNavigationTargetEntity.Schema,
      'revision': { 'minimum': 0, 'type': 'integer' },
      'roleSortKeys': { 'items': PresentationRoleSortKeyEntity.Schema, 'minItems': 1, 'type': 'array' },
      'themeKey': PresentationControlCommandEntity.ThemeKeySchema,
      'variant': { 'const': 'ready', 'type': 'string' }
    },
    'required': ['cvdPreviewTypes', 'diagramExpanded', 'revision', 'roleSortKeys', 'themeKey', 'variant'],
    'type': 'object'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
