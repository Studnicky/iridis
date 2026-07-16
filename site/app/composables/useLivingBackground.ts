/**
 * Ambient decorative drift: slowly perturbs the chroma of a handful of
 * engine-resolved roles (the ones AmbientBackground.vue's lava blobs and
 * HeroBanner.vue's orbs read via `--ui-color-{alias}-500`) and writes the
 * result back onto `document.documentElement` on a capped frame budget. This is
 * a purely decorative overlay on top of the engine's real palette in
 * useIridis.ts — it never touches background/text/muted/border tokens, and
 * it never runs the full `Tokens.mapFromEngine` pass, since only these six
 * shortcut variables are in play.
 */

import { evaluate } from '@studnicky/iridis-anima';
import { ClockBinding } from '@studnicky/iridis-pulse';
import { onScopeDispose } from 'vue';

import { Tokens } from '../theme/Tokens.ts';
import { buildDecorativePalette } from './buildDecorativePalette.ts';
import { ColorStreamHistoryState } from './colorStreamHistoryState.ts';
import { driftTarget } from './driftTarget.ts';
import { resolveFromPalette } from './resolveFromPalette.ts';
import { tokensForFrame } from './tokensForFrame.ts';
import { useIridis } from './useIridis.ts';

type UseLivingBackgroundOptionsType = {
  /** Record per-alias samples into `ColorStreamHistoryState` while this caller is mounted. */
  readonly 'recordStream': boolean;
};

const CYCLE_MS = 11000;
const LIVE_FPS = 20;
const FRAME_BUDGET_MS = Math.max(1, Math.round(1000 / LIVE_FPS));

let booted = false;
let activeConsumers = 0;
let streamConsumers = 0;
/** Pending interval handle for the running loop, or null when stopped. */
let tickInterval: number | null = null;
let isPaused = false;
let onVisibilityChange: (() => void) | null = null;
let onFocusChange: (() => void) | null = null;
let onReducedMotionChange: ((e: MediaQueryListEvent) => void) | null = null;
let reducedMotionQuery: MediaQueryList | null = null;

function isLoopEnabled(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (activeConsumers <= 0) return false;
  return true;
}

class Loop {
  static start(): void {
    if (booted) return;

    const { 'framing': framing, 'roleViews': roleViews } = useIridis();

    let from = buildDecorativePalette(roleViews.value);
    let to = driftTarget(from);
    let clock = ClockBinding.create({ 'durationMs': CYCLE_MS, 'mode': 'real' });

    const tick = (): void => {
      if (isPaused || activeConsumers <= 0) { return; }
      from = resolveFromPalette(from, roleViews.value);
      if (Object.keys(from).length > 0) {
        if (Object.keys(to).length === 0) {
          to = driftTarget(from);
        }
        const t = clock.t;
        const frame = evaluate(from, to, t);
        Tokens.apply(tokensForFrame(frame), framing.value);
        if (streamConsumers > 0) {
          ColorStreamHistoryState.record(frame);
        }
        if (t >= 1) {
          from = buildDecorativePalette(roleViews.value);
          to = driftTarget(from);
          clock = ClockBinding.create({ 'durationMs': CYCLE_MS, 'mode': 'real' });
        }
      }
    };

    const startTicking = (): void => {
      if (tickInterval !== null || isPaused) return;
      tick();
      tickInterval = window.setInterval(tick, FRAME_BUDGET_MS);
    };

    const stopTicking = (): void => {
      if (tickInterval !== null) {
        window.clearInterval(tickInterval);
        tickInterval = null;
      }
    };

    const onRunSignal = (): void => {
      isPaused = !isLoopEnabled();
      if (isPaused) {
        stopTicking();
      } else {
        startTicking();
      }
    };

    onVisibilityChange = onRunSignal;
    document.addEventListener('visibilitychange', onRunSignal);
    onFocusChange = onRunSignal;
    window.addEventListener('focus', onRunSignal);
    window.addEventListener('blur', onRunSignal);
    isPaused = !isLoopEnabled();

    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    onReducedMotionChange = () => { onRunSignal(); };
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);
    if (!isPaused) {
      startTicking();
    }

    booted = true;
  }

  static stop(): void {
    if (!booted) return;
    if (tickInterval !== null) {
      window.clearInterval(tickInterval);
      tickInterval = null;
    }
    if (onVisibilityChange !== null && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      onVisibilityChange = null;
    }
    if (onFocusChange !== null && typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocusChange);
      window.removeEventListener('blur', onFocusChange);
      onFocusChange = null;
    }
    if (reducedMotionQuery !== null && onReducedMotionChange !== null) {
      reducedMotionQuery.removeEventListener('change', onReducedMotionChange);
      reducedMotionQuery = null;
      onReducedMotionChange = null;
    }
    isPaused = true;
    booted = false;
  }
}

/** Cancels the running loop when no consumers remain and resets the singleton for clean HMR restart. */
function stopIfUnused(): void {
  if (activeConsumers > 0) return;
  Loop.stop();
}

/** Boots the ambient color-drift loop once per active consumer. */
function useLivingBackgroundCore(options: UseLivingBackgroundOptionsType): void {
  if (typeof window === 'undefined') { return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  activeConsumers += 1;
  if (options.recordStream) {
    streamConsumers += 1;
  }

  if (activeConsumers === 1) {
    Loop.start();
  }

  onScopeDispose(() => {
    activeConsumers = Math.max(0, activeConsumers - 1);
    if (options.recordStream) {
      streamConsumers = Math.max(0, streamConsumers - 1);
    }
    stopIfUnused();
  });
}

/** Boots the ambient color-drift loop once (module-level singleton — safe to call from multiple components). SSR- and reduced-motion-safe. */
export function useLivingBackground(options: Partial<UseLivingBackgroundOptionsType> = {}): void {
  useLivingBackgroundCore({ 'recordStream': options.recordStream ?? true });
}

// Tears the loop down before Vite re-evaluates this module on HMR — without
// this, every reload starts a second, uncancellable interval loop stacked on
// top of the old one.
import.meta.hot?.dispose(() => {
  activeConsumers = 0;
  streamConsumers = 0;
  Loop.stop();
});
