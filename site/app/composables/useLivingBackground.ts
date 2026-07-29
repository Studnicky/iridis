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

import type { ViteHotContext } from 'vite/types/hot.d.ts';

import { evaluate } from '@studnicky/iridis-anima';
import { ClockBinding } from '@studnicky/iridis-pulse';
import { onScopeDispose } from 'vue';

import { Tokens } from '../theme/Tokens.ts';
import { buildDecorativePalette } from './buildDecorativePalette.ts';
import { ColorStreamHistoryState } from './colorStreamHistoryState.ts';
import { LIVING_BACKGROUND } from './constants/LivingBackgroundConstants.ts';
import { driftTarget } from './driftTarget.ts';
import { resolveFromPalette } from './resolveFromPalette.ts';
import { tokensForFrame } from './tokensForFrame.ts';
import { useIridis } from './useIridis.ts';

class ViteModule {
  static readonly metadata: ImportMeta & { readonly 'hot'?: ViteHotContext } = import.meta;
}

declare class UseLivingBackgroundOptionsType {
  /** Record per-alias samples into `ColorStreamHistoryState` while this caller is mounted. */
  readonly recordStream: boolean;
}

declare class LivingBackgroundInvocationOptions {
  readonly recordStream?: boolean;
}

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

class IsLoopEnabledOperation {
  static run(): boolean {
    if (typeof document === 'undefined' || typeof window === 'undefined') {return false;}
    if (document.visibilityState !== 'visible') {return false;}
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {return false;}
    if (activeConsumers <= 0) {return false;}
    return true;
  }
}

const isLoopEnabled = IsLoopEnabledOperation.run;

class Loop {
  static start(): void {
    if (booted) {return;}

    const { 'framing': framing, 'roleViews': roleViews } = useIridis();

    let from = buildDecorativePalette(roleViews.value);
    let to = driftTarget(from);
    let clock = ClockBinding.create({ 'durationMs': LIVING_BACKGROUND.CYCLE_MS, 'mode': 'real' });

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
          clock = ClockBinding.create({ 'durationMs': LIVING_BACKGROUND.CYCLE_MS, 'mode': 'real' });
        }
      }
    };

    const startTicking = (): void => {
      if (tickInterval !== null || isPaused) {return;}
      tick();
      tickInterval = window.setInterval(tick, LIVING_BACKGROUND.FRAME_BUDGET_MS);
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
    if (!booted) {return;}
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
class StopIfUnusedOperation {
  static run(): void {
    if (activeConsumers > 0) {return;}
    Loop.stop();
  }
}

const stopIfUnused = StopIfUnusedOperation.run;

/** Boots the ambient color-drift loop once per active consumer. */
class UseLivingBackgroundCoreOperation {
  static run(options: UseLivingBackgroundOptionsType): void {
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
}

const useLivingBackgroundCore = UseLivingBackgroundCoreOperation.run;

/** Boots the ambient color-drift loop once (module-level singleton — safe to call from multiple components). SSR- and reduced-motion-safe. */
class UseLivingBackgroundOperation {
  static run(options: LivingBackgroundInvocationOptions = {}): void {
    useLivingBackgroundCore({ 'recordStream': options.recordStream ?? true });
  }
}

export const useLivingBackground = UseLivingBackgroundOperation.run;

// Tears the loop down before Vite re-evaluates this module on HMR — without
// this, every reload starts a second, uncancellable interval loop stacked on
// top of the old one.
ViteModule.metadata.hot?.dispose(() => {
  activeConsumers = 0;
  streamConsumers = 0;
  Loop.stop();
});
