import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PaletteSessionReadModelEntity } from './PaletteSessionReadModelEntity.ts';

/** Event-bus topics a session publishes. */
export namespace PaletteSessionTopicsEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/topics',
    'additionalProperties': false,
    'properties': { 'read-model': PaletteSessionReadModelEntity.Schema },
    'required': ['read-model'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'read-model': PaletteSessionReadModelEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
