import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';
import type { ThemeRegistration } from 'shiki';

import { EntityCompiler } from '@studnicky/entity/browser';

import { VscodeThemeJsonEntity } from '../composables/entities/VscodeThemeJsonEntity.ts';

/** Validates the canonical VS Code theme JSON passed to Shiki. */
export namespace ThemeRegistrationEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/shiki-theme-registration',
    'additionalProperties': false,
    'properties': {
      ...VscodeThemeJsonEntity.Schema.properties,
      'tokenColors': {
        'items': {
          'additionalProperties': true,
          'properties': {
            'name': { 'type': 'string' },
            'scope': { 'anyOf': [{ 'type': 'string' }, { 'items': { 'type': 'string' }, 'type': 'array' }] },
            'settings': {
              'additionalProperties': true,
              'properties': {
                'background': { 'type': 'string' },
                'fontStyle': { 'type': 'string' },
                'foreground': { 'type': 'string' }
              },
              'type': 'object'
            }
          },
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & ThemeRegistration;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
