import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

import { DataLayoutStrategy } from '../DataLayoutStrategy.ts';
import { renderDot } from '../particles/renderDot.ts';

/**
 * Warm hospitality/dining. A dining room doesn't have rotating or flashing
 * particles drifting through it — no starfield, no lava blobs. The ambient
 * warmth instead comes entirely from a candlelight-flicker vignette wash
 * (./restaurant.css), researched from real CSS candle-flame techniques.
 */
export const restaurant: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooFilter':       'none',
    'gridDisplay':     'none',
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleRenderer': renderDot,
    'speedMultiplier': 1.75
  },
  'dataLayout': DataLayoutStrategy.list,
  'key':   'restaurant',
  'label': 'Restaurant'
};
