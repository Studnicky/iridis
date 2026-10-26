import { inject } from 'vue';

import { ColorStreamHistoryState } from './colorStreamHistoryState.ts';

/** Resolves the colour-stream history provided by the current app instance. */
class UseColorStreamHistoryStateOperation {
  static run(): ColorStreamHistoryState {
    const state = inject(ColorStreamHistoryState.injectionKey);
    if (state === undefined) {
      throw new RangeError('ColorStreamHistoryState is not provided by the current app');
    }
    return state;
  }
}

export const useColorStreamHistoryState = UseColorStreamHistoryStateOperation.run;
