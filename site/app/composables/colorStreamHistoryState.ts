import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { reactive } from 'vue';

import type { RingBuffer } from './RingBuffer.ts';
import type { ColorSampleType } from './types/colorSample.ts';

import { oklchToHex } from '../utils/oklchToHex.ts';
import { createRingBuffer } from './createRingBuffer.ts';
import { DECORATIVE_ALIASES } from './decorativeAliases.ts';

/** Number of recent samples retained per decorative alias for the history stream. */
const HISTORY_CAPACITY = 240;

/**
 * Shared per-alias sample-history state for the "seismograph" history
 * stream — `record()` is called each animation frame by useLivingBackground.ts's
 * drift loop, `histories` is read by useColorStreamHistory.ts. Module-level
 * singleton so every component reads the exact same reactive snapshot.
 */
export class ColorStreamHistoryState {
  private static readonly ringBuffers: Record<string, RingBuffer<ColorSampleType>> = ColorStreamHistoryState.buildRingBuffers();

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

  /** Records one sample per decorative alias for this frame, then refreshes the reactive snapshot. */
  static record(frame: PaletteInterfaceType): void {
    for (const [alias, roleName] of Object.entries(DECORATIVE_ALIASES)) {
      const role = frame[roleName];
      if (role === undefined) { continue; }
      ColorStreamHistoryState.ringBuffers[alias]!.push({ 'chroma': role.c, 'hex': oklchToHex(role.l, role.c, role.h) });
    }
    for (const alias of Object.keys(DECORATIVE_ALIASES)) {
      ColorStreamHistoryState.histories[alias] = ColorStreamHistoryState.ringBuffers[alias]!.toArray();
    }
  }
}
