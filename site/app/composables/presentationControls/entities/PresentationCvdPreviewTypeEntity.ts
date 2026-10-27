import type { InferSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';

/** Colour-vision deficiency simulations the preview overlay can apply. */
export namespace PresentationCvdPreviewTypeEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/presentation-controls/cvd-preview-type',
    'enum': ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'],
    'type': 'string'
  } as const;

  export type Type = InferSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
