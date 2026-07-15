/**
 * Ambient decorative drift: slowly perturbs the chroma of a handful of
 * engine-resolved roles (the ones AmbientBackground.vue's lava blobs and
 * HeroBanner.vue's orbs read via `--ui-color-{alias}-500`) and writes the
 * result back onto `document.documentElement` each animation frame. This is
 * a purely decorative overlay on top of the engine's real palette in
 * useIridis.ts — it never touches background/text/muted/border tokens, and
 * it never runs the full `Tokens.mapFromEngine` pass, since only these six
 * shortcut variables are in play.
 */

import { evaluate } from '@studnicky/iridis-anima';
import { ClockBinding } from '@studnicky/iridis-pulse';

import { Tokens } from '../theme/Tokens.ts';
import { buildDecorativePalette } from './buildDecorativePalette.ts';
import { ColorStreamHistoryState } from './colorStreamHistoryState.ts';
import { driftTarget } from './driftTarget.ts';
import { resolveFromPalette } from './resolveFromPalette.ts';
import { tokensForFrame } from './tokensForFrame.ts';
import { useIridis } from './useIridis.ts';

const CYCLE_MS = 11000;

let booted = false;

class Loop {
  static start(): void {
    const { 'framing': framing, 'roleViews': roleViews } = useIridis();

    let from = buildDecorativePalette(roleViews.value);
    let to = driftTarget(from);
    let clock = ClockBinding.create({ 'durationMs': CYCLE_MS, 'mode': 'real' });

    const tick = (): void => {
      from = resolveFromPalette(from, roleViews.value);
      if (Object.keys(from).length > 0) {
        if (Object.keys(to).length === 0) {
          to = driftTarget(from);
        }
        const t = clock.t;
        const frame = evaluate(from, to, t);
        Tokens.apply(tokensForFrame(frame), framing.value);
        ColorStreamHistoryState.record(frame);
        if (t >= 1) {
          from = buildDecorativePalette(roleViews.value);
          to = driftTarget(from);
          clock = ClockBinding.create({ 'durationMs': CYCLE_MS, 'mode': 'real' });
        }
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }
}

/** Boots the ambient color-drift loop once (module-level singleton — safe to call from multiple components). SSR- and reduced-motion-safe. */
export function useLivingBackground(): void {
  if (booted) { return; }
  booted = true;
  if (typeof window === 'undefined') { return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
  Loop.start();
}
