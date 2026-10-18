import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Canonical VS Code theme JSON consumed by the interactive theme preview. */
export namespace VscodeThemeJsonEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/vscode-theme-json',
    'additionalProperties': false,
    'properties': {
      'colors': { 'additionalProperties': { 'type': 'string' }, 'type': 'object' },
      'name': { 'type': 'string' },
      'semanticHighlighting': { 'const': true, 'type': 'boolean' },
      'semanticTokenColors': { 'additionalProperties': true, 'type': 'object' },
      'tokenColors': { 'items': { 'additionalProperties': true, 'type': 'object' }, 'type': 'array' },
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
