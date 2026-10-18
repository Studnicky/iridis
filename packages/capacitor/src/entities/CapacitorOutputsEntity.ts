import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical admission boundary for every Capacitor output slot. */
export namespace CapacitorOutputsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'androidThemeXml': { 'type': 'string' },
      'splashScreen': {
        'additionalProperties': false,
        'properties': {
          'androidSplashResourceName': { 'type': 'string' },
          'backgroundColor':           { 'type': 'string' }
        },
        'required': ['backgroundColor'],
        'type': 'object'
      },
      'statusBar': {
        'additionalProperties': false,
        'properties': {
          'backgroundColor': { 'type': 'string' },
          'overlay':         { 'type': 'boolean' },
          'style':           { 'enum': ['DARK', 'LIGHT'], 'type': 'string' }
        },
        'required': ['backgroundColor', 'overlay', 'style'],
        'type': 'object'
      },
      'theme': {
        'additionalProperties': false,
        'properties': {
          'accent':        { 'type': 'string' },
          'background':    { 'type': 'string' },
          'error':         { 'type': 'string' },
          'info':          { 'type': 'string' },
          'primary':       { 'type': 'string' },
          'primaryDark':   { 'type': 'string' },
          'primaryLight':  { 'type': 'string' },
          'success':       { 'type': 'string' },
          'surface':       { 'type': 'string' },
          'text':          { 'type': 'string' },
          'textOnAccent':  { 'type': 'string' },
          'textOnPrimary': { 'type': 'string' },
          'warning':       { 'type': 'string' }
        },
        'required': [
          'accent', 'background', 'error', 'info', 'primary', 'primaryDark', 'primaryLight',
          'success', 'surface', 'text', 'textOnAccent', 'textOnPrimary', 'warning'
        ],
        'type': 'object'
      }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
