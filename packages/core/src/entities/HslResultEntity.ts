import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

/** HSL conversion result. Hue 0-360, saturation/lightness 0-1, alpha 0-1. */
export namespace HslResultEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/schema/core/hsl-result',
    'additionalProperties': false,
    'properties': {
      'alpha': { 'type': 'number' },
      'h':     { 'type': 'number' },
      'l':     { 'type': 'number' },
      's':     { 'type': 'number' }
    },
    'required': ['alpha', 'h', 'l', 's'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, InferType<typeof Schema>>(Schema);
}
