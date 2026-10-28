import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Vocabulary of output-format rows, in carousel order. */
export namespace OutputKeyEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/output-key',
    'enum': [
      'cssVars',
      'cssVarsScoped',
      'tailwind',
      'shadcn',
      'mui',
      'chakra',
      'panda',
      'unocss',
      'capacitor',
      'androidThemeXml',
      'json',
      'rdf'
    ],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
