import type { ThemeDefinitionInterfaceType } from '../ThemeDefinitionInterfaceType.ts';

/**
 * Warm hospitality/dining. A dining room doesn't have rotating or flashing
 * particles drifting through it — no starfield, no lava blobs. The ambient
 * warmth instead comes entirely from a candlelight-flicker vignette wash
 * (./restaurant.css), researched from real CSS candle-flame techniques.
 */
export const restaurant: ThemeDefinitionInterfaceType = {
  'ambient': {
    'blobCount':       0,
    'gooEnabled':      false,
    'gridEnabled':     false,
    'particleCounts':  [0, 0, 0, 0, 0],
    'particleShape':   'dot',
    'speedMultiplier': 1.75
  },
  'key':   'restaurant',
  'label': 'Restaurant'
};
