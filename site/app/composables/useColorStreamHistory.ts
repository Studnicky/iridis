import type { ColorSampleType } from './types/colorSample.ts';

import { ColorStreamHistoryState } from './colorStreamHistoryState.ts';

/**
 * Reactive per-alias sample-history snapshot for a scrolling "seismograph"
 * style consumer. Oldest-to-newest per role; empty arrays before any ticks
 * have run (SSR, reduced-motion, or not yet booted) rather than throwing.
 */
export function useColorStreamHistory(): Record<string, readonly ColorSampleType[]> {
  const result = ColorStreamHistoryState.histories;
  return result;
}
