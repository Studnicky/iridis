import { useNuxtApp } from '#imports';

import { PaletteSessionVueComposition } from './paletteSession/PaletteSessionVueComposition.ts';

/** The palette-session composition of the current Nuxt app or SSR request. */
class UsePaletteSessionOperation {
  static run(): PaletteSessionVueComposition {
    const result = PaletteSessionVueComposition.resolve(useNuxtApp());
    return result;
  }
}

export const usePaletteSession = UsePaletteSessionOperation.run;
