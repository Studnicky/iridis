import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { InputInterfaceTypeEntity } from '@studnicky/iridis';

/** Canonical request passed from reactive site state into the multi-output pipeline. */
export namespace MultiOutputRequestEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/multi-output-request',
    'additionalProperties': false,
    'properties': {
      'contrastStrictness': { 'enum': [0, 1, 2], 'type': 'number' },
      'input':              InputInterfaceTypeEntity.Schema
    },
    'required': ['contrastStrictness', 'input'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
