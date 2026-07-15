import type { JsonObjectType } from '@studnicky/types';

import type { ColorSpaceType } from './color.ts';

export type FramingType = 'dark' | 'light';

export interface RuntimeOptionsInterface {
  readonly 'colorSpace': ColorSpaceType | undefined;
  readonly 'extra':      Readonly<JsonObjectType> | undefined;
  readonly 'framing':    FramingType | undefined;
}
