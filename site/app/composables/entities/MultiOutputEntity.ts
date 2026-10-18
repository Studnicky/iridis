import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { ShadcnOutputEntity } from '@studnicky/iridis-shadcn';

const cssVariablesSchema = {
  'additionalProperties': true,
  'properties': { 'full': { 'type': 'string' } },
  'required': ['full'],
  'type': 'object'
} as const;

const configuredThemeSchema = {
  'additionalProperties': true,
  'properties': { 'config': { 'type': 'string' } },
  'required': ['config'],
  'type': 'object'
} as const;

const pandaThemeSchema = {
  'additionalProperties': false,
  'properties': {
    'colors': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
    'pandaConfig': { 'type': 'string' },
    'unoConfig': { 'type': 'string' }
  },
  'required': ['colors', 'pandaConfig', 'unoConfig'],
  'type': 'object'
} as const;

const capacitorThemeSchema = {
  'additionalProperties': true,
  'properties': {
    'accent':     { 'type': 'string' },
    'background': { 'type': 'string' },
    'primary':    { 'type': 'string' },
    'surface':    { 'type': 'string' },
    'text':       { 'type': 'string' }
  },
  'required': ['accent', 'background', 'primary', 'surface', 'text'],
  'type': 'object'
} as const;

const capacitorStatusBarSchema = {
  'additionalProperties': false,
  'properties': {
    'backgroundColor': { 'type': 'string' },
    'overlay':         { 'type': 'boolean' },
    'style':           { 'enum': ['DARK', 'LIGHT'], 'type': 'string' }
  },
  'required': ['backgroundColor', 'overlay', 'style'],
  'type': 'object'
} as const;

const capacitorSplashScreenSchema = {
  'additionalProperties': false,
  'properties': {
    'androidSplashResourceName': { 'type': 'string' },
    'backgroundColor':           { 'type': 'string' }
  },
  'required': ['backgroundColor'],
  'type': 'object'
} as const;

/** Canonical admitted engine outputs displayed by the site format showcase. */
export namespace MultiOutputEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/multi-output-result',
    'additionalProperties': false,
    'properties': {
      'capacitor:androidThemeXml': { 'type': 'string' },
      'capacitor:splashScreen':    capacitorSplashScreenSchema,
      'capacitor:statusBar':       capacitorStatusBarSchema,
      'capacitor:theme':           capacitorThemeSchema,
      'chakra:theme':              configuredThemeSchema,
      'core:json': {
        'additionalProperties': true,
        'properties': {
          'colors':   { 'items': { 'type': 'string' }, 'type': 'array' },
          'roles':    { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
          'variants': { 'additionalProperties': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' }, 'type': 'object' }
        },
        'required': ['colors', 'roles', 'variants'],
        'type': 'object'
      },
      'mui:theme':                configuredThemeSchema,
      'panda:theme':              pandaThemeSchema,
      'rdf:reasoningGraph':       { 'type': 'string' },
      'rdf:serialized':           { 'type': 'string' },
      'shadcn:theme':             ShadcnOutputEntity.Schema,
      'stylesheet:cssVars':       cssVariablesSchema,
      'stylesheet:cssVarsScoped': cssVariablesSchema,
      'tailwind:theme':           configuredThemeSchema
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
