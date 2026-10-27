import type {
  CanonicalShapeType, InferSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { THEMES } from '../../../theme/presets/index.ts';
import { PresentationCvdPreviewTypeEntity } from './PresentationCvdPreviewTypeEntity.ts';
import { PresentationNavigationTargetEntity } from './PresentationNavigationTargetEntity.ts';
import { PresentationRoleSortKeyEntity } from './PresentationRoleSortKeyEntity.ts';

/** A display-only interaction, discriminated by `interaction`; none of them reaches palette resolution. */
export namespace PresentationControlCommandEntity {
  export const ThemeKeySchema = {
    '$id': 'https://iridis.dev/site/presentation-controls/theme-key',
    'enum': Array.from(THEMES.keys()),
    'type': 'string'
  } as const;

  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/command',
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'interaction': {
            'const': 'theme.select',
            'type': 'string'
          },
          'themeKey': ThemeKeySchema
        },
        'required': [
          'interaction',
          'themeKey'
        ],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': {
            'const': 'role-sort.replace',
            'type': 'string'
          },
          'roleSortKeys': {
            'items': PresentationRoleSortKeyEntity.Schema,
            'minItems': 1,
            'type': 'array'
          }
        },
        'required': [
          'interaction',
          'roleSortKeys'
        ],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'cvdPreviewType': PresentationCvdPreviewTypeEntity.Schema,
          'interaction': {
            'const': 'cvd-preview.toggle',
            'type': 'string'
          }
        },
        'required': [
          'cvdPreviewType',
          'interaction'
        ],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': {
            'const': 'cvd-preview.clear',
            'type': 'string'
          }
        },
        'required': ['interaction'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'interaction': {
            'const': 'navigation-target.set',
            'type': 'string'
          },
          'navigationTarget': PresentationNavigationTargetEntity.Schema
        },
        'required': [
          'interaction',
          'navigationTarget'
        ],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'diagramExpanded': { 'type': 'boolean' },
          'interaction': {
            'const': 'diagram-view.set',
            'type': 'string'
          }
        },
        'required': [
          'diagramExpanded',
          'interaction'
        ],
        'type': 'object'
      }
    ]
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
