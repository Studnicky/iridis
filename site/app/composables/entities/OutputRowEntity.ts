import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { SupportedLangEntity } from './SupportedLangEntity.ts';

export namespace OutputRowEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/output-row',
    'additionalProperties': false,
    'properties': {
      'label': { 'type': 'string' },
      'language': SupportedLangEntity.Schema,
      'text': { 'type': 'string' }
    },
    'required': ['label', 'language', 'text'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
