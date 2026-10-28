import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

const semanticRuleSchema = {
  'additionalProperties': false,
  'properties': {
    'fontStyle': { 'type': 'string' },
    'foreground': { 'type': 'string' }
  },
  'required': [],
  'type': 'object'
} as const;

const tokenColorRuleSchema = {
  'additionalProperties': false,
  'properties': {
    'name': { 'type': 'string' },
    'scope': { 'anyOf': [{ 'type': 'string' }, { 'items': { 'type': 'string' }, 'type': 'array' }] },
    'settings': semanticRuleSchema
  },
  'required': ['name', 'scope', 'settings'],
  'type': 'object'
} as const;

/** Canonical VS Code theme JSON consumed by the interactive theme preview. */
export namespace VscodeThemeJsonEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/vscode-theme-json',
    'additionalProperties': false,
    'properties': {
      'colors': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'name': { 'type': 'string' },
      'semanticHighlighting': { 'enum': [true], 'type': 'boolean' },
      'semanticTokenColors': {
        'additionalProperties': {
          'anyOf': [{ 'type': 'string' }, semanticRuleSchema]
        },
        'type': 'object'
      },
      'tokenColors': { 'items': tokenColorRuleSchema, 'type': 'array' },
      'type': { 'enum': ['dark', 'light', 'hc-dark', 'hc-light'], 'type': 'string' }
    },
    'required': ['colors', 'name', 'semanticHighlighting', 'semanticTokenColors', 'tokenColors', 'type'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
