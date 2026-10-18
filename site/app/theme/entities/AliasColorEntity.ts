import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { ALIAS_COLOR_NAMES } from '../aliasColorNames.ts';

/** Canonical Nuxt UI semantic color accepted at the site presentation boundary. */
export namespace AliasColorEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/alias-color',
    'enum': ALIAS_COLOR_NAMES,
    'type': 'string'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const Values = [
    intake(ALIAS_COLOR_NAMES[0]),
    intake(ALIAS_COLOR_NAMES[1]),
    intake(ALIAS_COLOR_NAMES[2]),
    intake(ALIAS_COLOR_NAMES[3]),
    intake(ALIAS_COLOR_NAMES[4]),
    intake(ALIAS_COLOR_NAMES[5]),
    intake(ALIAS_COLOR_NAMES[6])
  ] as const;
}
