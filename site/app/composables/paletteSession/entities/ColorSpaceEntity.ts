import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** The colour space a palette resolves into. */
export namespace ColorSpaceEntity {
  const colorSpaces = ['srgb', 'displayP3'] as const;

  export const Schema = {
    '$id': 'https://iridis.dev/site/palette-session/color-space',
    'enum': colorSpaces,
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
