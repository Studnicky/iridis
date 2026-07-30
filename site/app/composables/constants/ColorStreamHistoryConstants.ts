import type { ColorSampleType } from '../types/colorSample.ts';

export namespace COLOR_STREAM_HISTORY {
  /** Number of recent samples retained per decorative alias for the history stream. */
  export const CAPACITY = 240;
  export const EMPTY_SAMPLE_ARRAY: readonly ColorSampleType[] = [];
}
