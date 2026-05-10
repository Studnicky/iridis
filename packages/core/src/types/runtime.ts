import type { ColorSpaceType } from './color.ts';

export type FramingType = 'dark' | 'light';

export interface RuntimeOptionsInterface {
  readonly framing?:    FramingType;
  readonly colorSpace?: ColorSpaceType;
  readonly extra?:      Readonly<Record<string, unknown>>;
}
