import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContrastPairEntity } from './ContrastPairEntity.ts';

/** `InputInterface.contrast`: run-level contrast enforcement options. */
export namespace ContrastOptionsEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/contrast-options',
    'additionalProperties': false,
    'properties': {
      'algorithm':  { 'enum': ['wcag21', 'apca'] },
      'cvdMode':     { 'enum': ['warn', 'nudge', 'enforce'] },
      'extra':      { 'items': ContrastPairEntity.Schema, 'type': 'array' },
      'level':      { 'type': 'string' },
      'nonMandatoryLevel': { 'enum': ['AA', 'AAA'] }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
