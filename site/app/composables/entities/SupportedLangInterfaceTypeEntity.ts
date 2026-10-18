import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { SUPPORTED_LANGS } from '../../theme/supportedLangs.ts';

export namespace SupportedLangInterfaceTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/supported-language',
    'enum': SUPPORTED_LANGS,
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
