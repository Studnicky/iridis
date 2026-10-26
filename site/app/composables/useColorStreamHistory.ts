import { onScopeDispose } from 'vue';

import type { ColorSampleType } from './types/colorSampleType.ts';

import { useColorStreamHistoryState } from './useColorStreamHistoryState.ts';

/** Refresh cadence of the reactive snapshot; a few Hz is enough for a live-swatch readout and keeps Vue re-renders off the sampling path. */
const REFRESH_INTERVAL_MS = 200;

/**
 * Reactive per-alias sample history of the current app instance, oldest to
 * newest, refreshed every `REFRESH_INTERVAL_MS` while the page is visible and
 * the calling scope is alive. Arrays are empty until the first samples arrive.
 * A consumer with its own draw loop reads `sampleArray()` on the state instead.
 */
class UseColorStreamHistoryOperation {
  static run(): Record<string, readonly ColorSampleType[]> {
    const state = useColorStreamHistoryState();
    if (typeof window !== 'undefined') {
      const intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          state.refreshSnapshot();
        }
      }, REFRESH_INTERVAL_MS);
      onScopeDispose(() => { window.clearInterval(intervalId); });
    }
    return state.histories;
  }
}

export const useColorStreamHistory = UseColorStreamHistoryOperation.run;
