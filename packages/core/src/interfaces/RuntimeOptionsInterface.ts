import type { JsonObjectType } from '@studnicky/types';

import type { ColorSpaceType } from '../types/color.ts';
import type { FramingType } from '../types/runtime.ts';

export interface RuntimeOptionsInterface {
  readonly 'colorSpace': ColorSpaceType | undefined;
  readonly 'extra':      Readonly<JsonObjectType> | undefined;
  readonly 'framing':    FramingType | undefined;
}
