import type { ColorSampleType } from './types/colorSample.ts';

import { ColorStreamHistoryState } from './colorStreamHistoryState.ts';

/**
 * How often the reactive snapshot refreshes. A few Hz is plenty for a
 * consumer like MotionShowcase.vue's `computed` live-swatch readout — far
 * below the 60Hz per-frame cadence useLivingBackground.ts's drift loop
 * writes samples at, which is exactly the point: this throttles the
 * reactive fan-out instead of firing a Vue re-render every frame.
 */
const REFRESH_INTERVAL_MS = 200;

let booted = false;
/** Interval handle for the running refresh loop, or null when stopped — lets `stop()` clear a scheduled interval instead of leaving it uncancellable. */
let intervalId: ReturnType<typeof setInterval> | null = null;
let onVisibilityChange: (() => void) | null = null;

function stop(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (onVisibilityChange !== null && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange = null;
  }
  booted = false;
}

function startRefreshLoop(): void {
  stop();
  if (typeof window === 'undefined' || typeof document === 'undefined') { return; }
  intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      ColorStreamHistoryState.refreshSnapshot();
    }
  }, REFRESH_INTERVAL_MS);

  onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && intervalId === null) {
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          ColorStreamHistoryState.refreshSnapshot();
        }
      }, REFRESH_INTERVAL_MS);
      return;
    }
    if (document.visibilityState !== 'visible' && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
}

/**
 * Reactive per-alias sample-history snapshot for a scrolling "seismograph"
 * style consumer. Oldest-to-newest per role; empty arrays before any ticks
 * have run (SSR, reduced-motion, or not yet booted) rather than throwing.
 *
 * The returned object refreshes on a throttled cadence (`REFRESH_INTERVAL_MS`),
 * not every animation frame. A frame-accurate reader driving its own draw
 * loop (e.g. ColorStreamCard.vue) should call
 * `ColorStreamHistoryState.sampleArray()` directly instead of subscribing to
 * this snapshot.
 */
export function useColorStreamHistory(): Record<string, readonly ColorSampleType[]> {
  if (!booted && typeof window !== 'undefined') {
    booted = true;
    startRefreshLoop();
  }
  return ColorStreamHistoryState.histories;
}

// Tears the refresh loop down before Vite re-evaluates this module on HMR —
// without this, every reload starts a second interval stacked on top of the
// old one.
import.meta.hot?.dispose(() => { stop(); });
