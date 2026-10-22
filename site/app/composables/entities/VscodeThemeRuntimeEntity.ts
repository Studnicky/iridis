import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { RoleProvenanceEntity } from '@studnicky/iridis';

import { VscodeThemeJsonEntity } from './VscodeThemeJsonEntity.ts';

/** Admits provenance and emitted-theme records returned by the VS Code pipeline. */
export namespace VscodeThemeRuntimeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/vscode-theme-runtime',
    'additionalProperties': false,
    'properties': {
      'roleProvenance': { 'additionalProperties': RoleProvenanceEntity.Schema, 'type': 'object' },
      'themeJson': VscodeThemeJsonEntity.Schema
    },
    'required': ['roleProvenance', 'themeJson'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
