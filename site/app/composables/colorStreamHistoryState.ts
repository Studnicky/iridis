import type { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

import { reactive } from 'vue';

import type { RingBuffer } from './RingBuffer.ts';
import type { ColorSampleType } from './types/colorSampleType.ts';

import { oklchToHex } from '../utils/oklchToHex.ts';
import { COLOR_STREAM_HISTORY } from './constants/ColorStreamHistoryConstants.ts';
import { createRingBuffer } from './createRingBuffer.ts';
import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

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
  private static readonly aliasNames = Object.keys(DECORATIVE_ALIASES);
  private static readonly ringBuffers: Record<string, RingBuffer<ColorSampleType>> = ColorStreamHistoryState.buildRingBuffers();
  static readonly histories: Record<string, ColorSampleType[]> = reactive(ColorStreamHistoryState.buildHistories());
  static readonly sampleVersion = { 'value': 0 };

  private static buildHistories(): Record<string, ColorSampleType[]> {
    const histories: Record<string, ColorSampleType[]> = {};
    for (let index = 0; index < ColorStreamHistoryState.aliasNames.length; index += 1) {
      const alias = ColorStreamHistoryState.aliasNames[index];
      if (alias === undefined) {
        throw new RangeError(`Decorative alias list is missing entry ${index}`);
      }
      Object.defineProperty(histories, alias, { 'configurable': true, 'enumerable': true, 'value': [], 'writable': true });
    }
    const result = histories;
    return result;
  }

  private static buildRingBuffers(): Record<string, RingBuffer<ColorSampleType>> {
    const buffers: Record<string, RingBuffer<ColorSampleType>> = {};
    for (let index = 0; index < ColorStreamHistoryState.aliasNames.length; index += 1) {
      const alias = ColorStreamHistoryState.aliasNames[index];
      if (alias === undefined) {
        throw new RangeError(`Decorative alias list is missing entry ${index}`);
      }
      Object.defineProperty(buffers, alias, { 'configurable': true, 'enumerable': true, 'value': createRingBuffer<ColorSampleType>(COLOR_STREAM_HISTORY.CAPACITY), 'writable': true });
    }
    const result = buffers;
    return result;
  }

  /**
   * Records one sample per decorative alias for this frame — pushes into the
   * plain (non-reactive) ring buffers ONLY. Deliberately never touches the
   * reactive `histories` snapshot: this runs on every animation frame
   * (60x/sec), and a reactive write here would fan a Vue re-render out to
   * every `histories` subscriber on every one of those frames.
   */
  static record(frame: PaletteInterfaceTypeEntity.Type): void {
    const entries = Object.entries(DECORATIVE_ALIASES);
    let didRecord = false;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        throw new RangeError(`Decorative alias entry list is missing entry ${index}`);
      }
      const [alias, roleName] = entry;
      const role = frame[roleName];
      const ringBuffer = ColorStreamHistoryState.ringBuffers[alias];
      if (role === undefined || ringBuffer === undefined) { continue; }
      ringBuffer.push({ 'chroma': role.c, 'hex': oklchToHex(role.l, role.c, role.h) });
      didRecord = true;
    }
    if (didRecord) {
      ColorStreamHistoryState.sampleVersion.value += 1;
    }
  }

  /** Plain, non-reactive oldest-to-newest snapshot of ONE alias's ring buffer — for a frame-accurate reader driving its own draw loop rather than subscribing to `histories`. Empty array for an unknown alias. */
  static sampleArray(alias: string): readonly ColorSampleType[] {
    const result = ColorStreamHistoryState.ringBuffers[alias]?.snapshot() ?? COLOR_STREAM_HISTORY.EMPTY_SAMPLE_ARRAY;
    return result;
  }

  /** Copies every alias's current ring-buffer contents into the reactive `histories` snapshot. Call on a throttled cadence (see useColorStreamHistory.ts) — never per animation frame. */
  static refreshSnapshot(): void {
    for (let index = 0; index < ColorStreamHistoryState.aliasNames.length; index += 1) {
      const alias = ColorStreamHistoryState.aliasNames[index];
      if (alias === undefined) {
        throw new RangeError(`Decorative alias list is missing entry ${index}`);
      }
      const ringBuffer = ColorStreamHistoryState.ringBuffers[alias];
      const target = ColorStreamHistoryState.histories[alias];
      if (ringBuffer === undefined || target === undefined) { continue; }
      const snapshot = ringBuffer.snapshot();
      target.length = 0;
      for (let sampleIndex = 0; sampleIndex < snapshot.length; sampleIndex += 1) {
        const sample = snapshot[sampleIndex];
        if (sample === undefined) {
          throw new RangeError(`Color stream snapshot for ${alias} is missing entry ${sampleIndex}`);
        }
        target.push(sample);
      }
    }
  }
}
