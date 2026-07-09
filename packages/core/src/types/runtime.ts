import type { JsonObjectType } from '@studnicky/types';

import type { ColorSpaceType } from './color.ts';

export type FramingType = 'dark' | 'light';

export interface RuntimeOptionsInterface {
  readonly 'colorSpace'?: ColorSpaceType;
  readonly 'extra'?:      Readonly<JsonObjectType>;
  readonly 'framing'?:    FramingType;
}
