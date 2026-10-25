import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

export namespace SchemaNameEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/schema-name',
    'enum': ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const defaultValue = intake('iridis-32');
}
