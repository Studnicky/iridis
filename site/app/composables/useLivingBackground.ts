import { onBeforeUnmount, onMounted, watch } from 'vue';

import type { LivingBackgroundFrameInterface } from './interfaces/LivingBackgroundFrameInterface.ts';

import { BrowserLivingBackgroundEnvironment } from './BrowserLivingBackgroundEnvironment.ts';
import { LivingBackgroundDriver } from './LivingBackgroundDriver.ts';
import { useColorStreamHistoryState } from './useColorStreamHistoryState.ts';
import { useIridis } from './useIridis.ts';

/**
 * Runs the ambient colour drift for the calling component and delivers each
 * frame to `onFrame`. Samples feed the app instance's colour-stream history.
 * The loop pauses while the tab is hidden and renders a single static frame
 * under reduced motion. Nothing is written to the document root.
 */
class UseLivingBackgroundOperation {
  public static run(onFrame: (frame: LivingBackgroundFrameInterface) => void): void {
    const { roleViews } = useIridis();
    const recorder = useColorStreamHistoryState();
    let driver: LivingBackgroundDriver | null = null;
    onMounted(() => {
      driver = new LivingBackgroundDriver({
        'environment': new BrowserLivingBackgroundEnvironment(window),
        'onFrame': onFrame,
        'readViews': () => { return roleViews.value; },
        'recorder': recorder
      });
      driver.start();
    });
    watch(roleViews, () => { driver?.paletteCommitted(); });
    onBeforeUnmount(() => { driver?.stop(); });
  }
}

export const useLivingBackground = UseLivingBackgroundOperation.run;
