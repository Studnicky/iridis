import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';
import type { ThemeRegistration } from 'shiki';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Validates the subset of VS Code theme JSON registered with Shiki. */
export namespace ThemeRegistrationEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/shiki-theme-registration',
    'additionalProperties': false,
    'properties': {
      'colors': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'name': { 'type': 'string' },
      'tokenColors': {
        'items': {
          'additionalProperties': true,
          'properties': {
            'name': { 'type': 'string' },
            'scope': {
              'anyOf': [
                { 'type': 'string' },
                { 'items': { 'type': 'string' }, 'type': 'array' }
              ]
            },
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
      },
      'type': { 'enum': ['dark', 'light', 'hc-dark', 'hc-light'], 'type': 'string' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & ThemeRegistration;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
