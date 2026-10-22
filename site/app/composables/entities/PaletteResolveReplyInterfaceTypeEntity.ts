import type {
  CanonicalShapeType, NominalSchemaType
} from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { PaletteSnapshotInterfaceTypeEntity } from './PaletteSnapshotInterfaceTypeEntity.ts';

/** Message returned by the resolve host: the snapshot for a request id, or the failure message. */
export namespace PaletteResolveReplyInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-resolve-reply',
    'additionalProperties': false,
    'properties': {
      'failure': { 'type': 'string' },
      'id': { 'type': 'integer' },
      'snapshot': PaletteSnapshotInterfaceTypeEntity.Schema
    },
    'required': ['id'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'snapshot'?: PaletteSnapshotInterfaceTypeEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
