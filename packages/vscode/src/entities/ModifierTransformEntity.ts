import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';

const FONT_STYLE_VALUES = ['bold', 'bold italic', 'italic', 'strikethrough', 'underline'] as const;

/**
 * Per-modifier delta applied on top of a token's base color: lightness,
 * saturation, mix-toward-role weight, and font style.
 */
export namespace ModifierTransformEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'fontStyle':  { 'enum': FONT_STYLE_VALUES },
      'lightness':  { 'type': 'number' },
      'mixWeight':  { 'type': 'number' },
      'mixWith':    { 'type': 'string' },
      'saturation': { 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
