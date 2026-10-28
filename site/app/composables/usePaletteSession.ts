import { useNuxtApp, useRuntimeConfig, useState } from '#imports';

import type { PaletteSnapshotEntity } from './entities/PaletteSnapshotEntity.ts';

import { PALETTE_SESSION_CONSTANTS } from './constants/PALETTE_SESSION_CONSTANTS.ts';
import { PaletteSessionSnapshotSlot } from './paletteSession/PaletteSessionSnapshotSlot.ts';
import { PaletteSessionVueComposition } from './paletteSession/PaletteSessionVueComposition.ts';

/** The palette-session composition of the current Nuxt app or SSR request, with its page-shell effects started. */
class UsePaletteSessionOperation {
  private static sampleImageUrl(): string {
    const appConfiguration = useRuntimeConfig().app;
    if (typeof appConfiguration !== 'object' || !('baseURL' in appConfiguration) || typeof appConfiguration.baseURL !== 'string') {
      throw new TypeError('Nuxt runtime configuration must provide app.baseURL');
    }
    const result = `${appConfiguration.baseURL}logo.png`;
    return result;
  }

  static run(): PaletteSessionVueComposition {
    const result = PaletteSessionVueComposition.resolve(useNuxtApp());
    const state = useState<PaletteSnapshotEntity.Type | null>(PALETTE_SESSION_CONSTANTS.SNAPSHOT_STATE_KEY, () => {
      const initial = null;
      return initial;
    });
    result.boot(new PaletteSessionSnapshotSlot(
      () => {
        const snapshot = state.value;
        return snapshot;
      },
      (snapshot) => { state.value = snapshot; }
    ), UsePaletteSessionOperation.sampleImageUrl());
    return result;
  }
}

export const usePaletteSession = UsePaletteSessionOperation.run;
