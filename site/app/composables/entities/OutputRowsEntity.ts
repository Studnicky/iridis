import type { CanonicalShapeType, InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { OutputRowEntity } from './OutputRowEntity.ts';

/** Output rows keyed by OutputKeyEntity; a key is present when its emitter ran. */
export namespace OutputRowsEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/output-rows',
    'additionalProperties': false,
    'properties': {
      'androidThemeXml': OutputRowEntity.Schema,
      'capacitor': OutputRowEntity.Schema,
      'chakra': OutputRowEntity.Schema,
      'cssVars': OutputRowEntity.Schema,
      'cssVarsScoped': OutputRowEntity.Schema,
      'json': OutputRowEntity.Schema,
      'mui': OutputRowEntity.Schema,
      'panda': OutputRowEntity.Schema,
      'rdf': OutputRowEntity.Schema,
      'shadcn': OutputRowEntity.Schema,
      'tailwind': OutputRowEntity.Schema,
      'unocss': OutputRowEntity.Schema
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);
}
