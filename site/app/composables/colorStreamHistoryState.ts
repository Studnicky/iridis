import type { PaletteEntity } from '@studnicky/iridis-algebra';
import type { InjectionKey } from 'vue';

import { reactive } from 'vue';

import type { FrameRecorderInterface } from './interfaces/FrameRecorderInterface.ts';
import type { RingBuffer } from './RingBuffer.ts';
import type { ColorSampleType } from './types/colorSampleType.ts';

import { oklchToHex } from '../utils/oklchToHex.ts';
import { COLOR_STREAM_HISTORY } from './constants/ColorStreamHistoryConstants.ts';
import { createRingBuffer } from './createRingBuffer.ts';
import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

/**
 * Per-alias sample history for the colour stream. One instance exists per app
 * instance (provided by the colorStreamHistory plugin), so concurrent requests
 * never share samples.
 *
 * Two read paths with different cadences:
 *  - `sampleArray()` is a plain read off the ring buffer for a consumer that
 *    runs its own draw loop (ColorStreamCard.vue).
 *  - `histories` / `refreshSnapshot()` is a reactive snapshot refreshed on a
 *    throttled cadence (see useColorStreamHistory.ts), never per sample.
 */
export class ColorStreamHistoryState implements FrameRecorderInterface {
  public static readonly injectionKey: InjectionKey<ColorStreamHistoryState> = Symbol('ColorStreamHistoryState');

  public readonly histories: Record<string, ColorSampleType[]> = reactive<Record<string, ColorSampleType[]>>({});
  public sampleVersion = 0;
  private readonly ringBuffers = new Map<string, RingBuffer<ColorSampleType>>();

  public constructor() {
    const aliasNames = Object.keys(DECORATIVE_ALIASES);
    for (let index = 0; index < aliasNames.length; index += 1) {
      const alias = aliasNames[index];
      if (alias === undefined) {
        throw new RangeError(`Decorative alias list is missing entry ${index}`);
      }
      this.ringBuffers.set(alias, createRingBuffer<ColorSampleType>(COLOR_STREAM_HISTORY.CAPACITY));
      Object.defineProperty(this.histories, alias, { 'configurable': true, 'enumerable': true, 'value': [], 'writable': true });
    }
  }

  /** Pushes one sample per decorative alias into the plain ring buffers; the reactive snapshot is untouched. */
  public record(frame: PaletteEntity.Type): void {
    const entries = Object.entries(DECORATIVE_ALIASES);
    let didRecord = false;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        throw new RangeError(`Decorative alias entry list is missing entry ${index}`);
      }
      const [alias, roleName] = entry;
      const role = frame[roleName];
      const ringBuffer = this.ringBuffers.get(alias);
      if (role !== undefined && ringBuffer !== undefined) {
        ringBuffer.push({ 'chroma': role.c, 'hex': oklchToHex(role.l, role.c, role.h) });
        didRecord = true;
      }
    }
    if (didRecord) {
      this.sampleVersion += 1;
    }
  }

  /** Oldest-to-newest samples of one alias; empty for an unknown alias. */
  public sampleArray(alias: string): readonly ColorSampleType[] {
    const result = this.ringBuffers.get(alias)?.snapshot() ?? COLOR_STREAM_HISTORY.EMPTY_SAMPLE_ARRAY;
    return result;
  }

  /** Copies every ring buffer into the reactive `histories` snapshot. */
  public refreshSnapshot(): void {
    this.ringBuffers.forEach((ringBuffer, alias) => {
      const target = this.histories[alias];
      if (target !== undefined) {
        target.length = 0;
        target.push(...ringBuffer.snapshot());
      }
    });
  }
}
