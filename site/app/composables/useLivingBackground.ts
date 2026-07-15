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

import { reactive } from 'vue';

import { perpendicular } from '@studnicky/iridis-algebra';
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';
import { evaluate } from '@studnicky/iridis-anima';
import { ClockBinding } from '@studnicky/iridis-pulse';

import type { RoleHexMapType, RoleViewType } from './types/index.ts';
import { Tokens } from '../theme/Tokens.ts';
import { oklchToHex } from '../utils/oklchToHex.ts';
import { useIridis } from './useIridis.ts';

/** One recorded color-drift sample for a decorative role at a given tick. */
export interface ColorSampleType {
  chroma: number;
  hex: string;
}

/** Plain array-based ring buffer — simple shift+push, fine at this scale (capacity ~240, not a hot path). */
export class RingBuffer<T> {
  private readonly items: T[] = [];

  public constructor(private readonly capacity: number) {}

  public push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacity) { this.items.shift(); }
  }

  /** Oldest-to-newest. */
  public toArray(): T[] {
    return [...this.items];
  }
}

export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
  return new RingBuffer<T>(capacity);
}

/** Nuxt UI alias -> first-candidate source role, per Tokens.ts's ALIAS_SOURCE — restricted to the decorative aliases AmbientBackground.vue's LAVA_ROLES actually reads. */
export const DECORATIVE_ALIASES: Record<string, string> = {
  'primary':   'brand',
  'secondary': 'accent-alt',
  'success':   'success',
  'warning':   'warning',
  'error':     'error',
  'info':      'info'
};
const DECORATIVE_ROLE_NAMES: readonly string[] = [...new Set(Object.values(DECORATIVE_ALIASES))];

const CYCLE_MS = 11000;
const MAX_DRIFT_DELTA = 0.035;

/** Builds a Palette restricted to the decorative role names, from the live engine roleViews. */
export function buildDecorativePalette(views: RoleViewType[]): PaletteInterfaceType {
  const palette: PaletteInterfaceType = {};
  for (const name of DECORATIVE_ROLE_NAMES) {
    const view = views.find((v) => v.name === name);
    if (view === undefined) { continue; }
    palette[name] = { 'c': view.c, 'h': view.h, 'l': view.l };
  }
  return palette;
}

/** A subtle per-role chroma drift target — never the same point twice in a row, never a wide swing. */
export function driftTarget(from: PaletteInterfaceType, rand: () => number = Math.random): PaletteInterfaceType {
  let to = from;
  for (const role of Object.keys(from)) {
    const delta = (rand() * 2 - 1) * MAX_DRIFT_DELTA;
    to = perpendicular(to, role, delta);
  }
  return to;
}

/** Builds the partial `--ui-color-{alias}-500` token set for one animation frame's palette. */
export function tokensForFrame(frame: PaletteInterfaceType): RoleHexMapType {
  const tokens: RoleHexMapType = {};
  for (const [alias, roleName] of Object.entries(DECORATIVE_ALIASES)) {
    const role = frame[roleName];
    if (role === undefined) { continue; }
    tokens[`--ui-color-${alias}-500`] = oklchToHex(role.l, role.c, role.h);
  }
  return tokens;
}

/**
 * Resolves the palette to drift from for the current tick. If `from` is
 * already populated, it's returned unchanged. Otherwise this re-attempts
 * `buildDecorativePalette(views)` — the engine's initial palette resolves
 * asynchronously (image extraction in useIridis.ts), so `views` may still be
 * empty on the first several ticks after `useLivingBackground()` is invoked;
 * retrying here (rather than giving up after one empty read) is what lets the
 * loop pick up the palette once it becomes available.
 */
export function resolveFromPalette(from: PaletteInterfaceType, views: RoleViewType[]): PaletteInterfaceType {
  if (Object.keys(from).length > 0) { return from; }
  return buildDecorativePalette(views);
}

/** Number of recent samples retained per decorative alias for the history stream. */
export const COLOR_STREAM_HISTORY_CAPACITY = 240;

const ringBuffers: Record<string, RingBuffer<ColorSampleType>> = {};
for (const alias of Object.keys(DECORATIVE_ALIASES)) {
  ringBuffers[alias] = createRingBuffer<ColorSampleType>(COLOR_STREAM_HISTORY_CAPACITY);
}

const histories: Record<string, ColorSampleType[]> = reactive(
  Object.fromEntries(Object.keys(DECORATIVE_ALIASES).map((alias) => [alias, []]))
);

/** Records one sample per decorative alias for this frame, then refreshes the reactive snapshot. */
function recordFrameSamples(frame: PaletteInterfaceType): void {
  for (const [alias, roleName] of Object.entries(DECORATIVE_ALIASES)) {
    const role = frame[roleName];
    if (role === undefined) { continue; }
    ringBuffers[alias]!.push({ 'chroma': role.c, 'hex': oklchToHex(role.l, role.c, role.h) });
  }
  for (const alias of Object.keys(DECORATIVE_ALIASES)) {
    histories[alias] = ringBuffers[alias]!.toArray();
  }
}

/**
 * Reactive per-alias sample-history snapshot for a scrolling "seismograph"
 * style consumer. Oldest-to-newest per role; empty arrays before any ticks
 * have run (SSR, reduced-motion, or not yet booted) rather than throwing.
 */
export function useColorStreamHistory(): Record<string, ReadonlyArray<ColorSampleType>> {
  return histories;
}

let booted = false;

function startLoop(): void {
  const { 'roleViews': roleViews, 'framing': framing } = useIridis();

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
      recordFrameSamples(frame);
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

/** Boots the ambient color-drift loop once (module-level singleton — safe to call from multiple components). SSR- and reduced-motion-safe. */
export function useLivingBackground(): void {
  if (booted) { return; }
  booted = true;
  if (typeof window === 'undefined') { return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
  startLoop();
}
