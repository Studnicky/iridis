import { useNuxtApp } from '#imports';

import { PresentationControlsComposition } from './presentationControls/PresentationControlsComposition.ts';

/** The presentation-control composition of the current Nuxt app or SSR request. */
class UsePresentationControlsOperation {
  static run(): PresentationControlsComposition {
    const result = PresentationControlsComposition.resolve(useNuxtApp());
    return result;
  }
}

export const usePresentationControls = UsePresentationControlsOperation.run;
