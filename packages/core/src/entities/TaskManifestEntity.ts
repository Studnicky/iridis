import type { InferType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** Declarative pipeline-task manifest: name, lifecycle phase, and read/write/require slots. */
export namespace TaskManifestEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/task-manifest',
    'additionalProperties': false,
    'properties': {
      'description': { 'type': 'string' },
      'name':        { 'type': 'string' },
      'phase':       { 'enum': ['onRunStart', 'onRunEnd'] },
      'reads':       { 'items': { 'type': 'string' }, 'type': 'array' },
      'requires':    { 'items': { 'type': 'string' }, 'type': 'array' },
      'writes':      { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
