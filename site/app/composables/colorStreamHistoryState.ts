import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { reactive } from 'vue';

import type { RingBuffer } from './RingBuffer.ts';
import type { ColorSampleType } from './types/colorSample.ts';

import { oklchToHex } from '../utils/oklchToHex.ts';
import { createRingBuffer } from './createRingBuffer.ts';
import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

/** Number of recent samples retained per decorative alias for the history stream. */
const HISTORY_CAPACITY = 240;
const EMPTY_SAMPLE_ARRAY: readonly ColorSampleType[] = [];

  /**
   * Shared per-alias sample-history state for the "seismograph" history
   * stream — `record()` is called each animation frame by useLivingBackground.ts's
   * drift loop. Module-level singleton so every component reads off the same
   * ring buffers.
 *
 * Two read paths, deliberately different cadences:
 *  - `sampleArray()` — a plain, non-reactive read straight off the ring
 *    buffer, for a frame-accurate consumer that already runs its own draw
 *    loop (ColorStreamCard.vue) and would rather pull fresh data itself than
 *    subscribe to a Vue-reactive snapshot.
 *  - `histories` / `refreshSnapshot()` — a reactive snapshot for consumers
 *    that need Vue to re-render on change (e.g. a `computed`); refreshed on
 *    whatever cadence the caller chooses (see useColorStreamHistory.ts),
 *    never per frame.
 */
export class ColorStreamHistoryState {
  private static readonly ringBuffers: Record<string, RingBuffer<ColorSampleType>> = ColorStreamHistoryState.buildRingBuffers();
  private static sampleVersion = 0;

  /** Reactive per-alias snapshot — only ever written by `refreshSnapshot()`, never by `record()`. Stale between refreshes by design; see the class doc for why. */
  static readonly histories: Record<string, ColorSampleType[]> = reactive(
    Object.fromEntries(Object.keys(DECORATIVE_ALIASES).map((alias) => {return [alias, []];}))
  );

  private static buildRingBuffers(): Record<string, RingBuffer<ColorSampleType>> {
    const buffers: Record<string, RingBuffer<ColorSampleType>> = {};
    for (const alias of Object.keys(DECORATIVE_ALIASES)) {
      buffers[alias] = createRingBuffer<ColorSampleType>(HISTORY_CAPACITY);
    }
    return buffers;
  }

  /**
   * Records one sample per decorative alias for this frame — pushes into the
   * plain (non-reactive) ring buffers ONLY. Deliberately never touches the
   * reactive `histories` snapshot: this runs on every animation frame
   * (60x/sec), and a reactive write here would fan a Vue re-render out to
   * every `histories` subscriber on every one of those frames.
   */
  static record(frame: PaletteInterfaceType): void {
    let didRecord = false;
    for (const [alias, roleName] of Object.entries(DECORATIVE_ALIASES)) {
      const role = frame[roleName];
      if (role === undefined) { continue; }
      ColorStreamHistoryState.ringBuffers[alias]!.push({ 'chroma': role.c, 'hex': oklchToHex(role.l, role.c, role.h) });
      didRecord = true;
    }
    if (didRecord) {
      ColorStreamHistoryState.sampleVersion += 1;
    }
  }

  /** Plain, non-reactive oldest-to-newest snapshot of ONE alias's ring buffer — for a frame-accurate reader driving its own draw loop rather than subscribing to `histories`. Empty array for an unknown alias. */
  static sampleArray(alias: string): readonly ColorSampleType[] {
    return ColorStreamHistoryState.ringBuffers[alias]?.snapshot() ?? EMPTY_SAMPLE_ARRAY;
  }

  /** Copies every alias's current ring-buffer contents into the reactive `histories` snapshot. Call on a throttled cadence (see useColorStreamHistory.ts) — never per animation frame. */
  static refreshSnapshot(): void {
    for (const alias of Object.keys(DECORATIVE_ALIASES)) {
      const snapshot = ColorStreamHistoryState.ringBuffers[alias]!.snapshot();
      const target = ColorStreamHistoryState.histories[alias];
      if (target === undefined) { continue; }
      target.length = 0;
      for (const sample of snapshot) {
        target.push(sample);
      }
    }
  }

  static sampleVersionStamp(): number {
    return ColorStreamHistoryState.sampleVersion;
  }
}
