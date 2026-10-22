import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { WorkerMessageEntity } from './WorkerMessageEntity.ts';

/** Message posted to the engine worker: a message tagged with its sequence id. */
export namespace WorkerEnvelopeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/worker-envelope',
    'additionalProperties': false,
    'properties': {
      'id': { 'type': 'integer' },
      'message': WorkerMessageEntity.Schema
    },
    'required': ['id', 'message'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema> & { 'message': WorkerMessageEntity.Type };

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
