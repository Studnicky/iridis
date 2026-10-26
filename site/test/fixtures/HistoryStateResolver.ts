import type { App } from 'vue';

import { createApp } from 'vue';

import type { ColorStreamHistoryState } from '../../app/composables/colorStreamHistoryState.ts';

import { useColorStreamHistoryState } from '../../app/composables/useColorStreamHistoryState.ts';

/** Builds bare app instances and resolves the colour-stream history each provides, the way a component setup would. */
export class HistoryStateResolver {
  public static createApp(): App {
    const app = createApp({});
    return app;
  }

  public static resolve(app: App): ColorStreamHistoryState {
    const state = app.runWithContext(useColorStreamHistoryState);
    return state;
  }
}
